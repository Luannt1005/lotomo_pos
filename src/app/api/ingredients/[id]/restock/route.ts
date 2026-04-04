import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { quantity, total_cost, note } = await request.json();

    // 1. Fetch current ingredient
    const { data: ingredient, error: fetchError } = await supabaseAdmin
      .from("ingredients")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !ingredient) {
      return NextResponse.json({ error: "Ingredient not found" }, { status: 404 });
    }

    // 2. Calculate moving average unit cost
    const currentStock = ingredient.stock_quantity;
    const currentUnitCost = ingredient.unit_cost;
    const addedQuantity = Number(quantity);
    const addedTotalCost = Number(total_cost);

    const newStock = currentStock + addedQuantity;
    let newUnitCost = currentUnitCost;

    if (newStock > 0 && addedQuantity > 0) {
        // Weighted Moving Average
        const currentTotalValue = currentStock * currentUnitCost;
        newUnitCost = Math.round((currentTotalValue + addedTotalCost) / newStock);
    }

    // 3. Update ingredient
    const { data: updatedIngredient, error: updateError } = await supabaseAdmin
      .from("ingredients")
      .update({
          stock_quantity: newStock,
          unit_cost: newUnitCost
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 4. Create inventory log
    const { error: logError } = await supabaseAdmin
      .from("inventory_logs")
      .insert([{
          ingredient_id: id,
          type: addedQuantity >= 0 ? "import" : "adjustment",
          quantity: addedQuantity,
          cost_per_unit_at_time: addedQuantity > 0 ? Math.round(addedTotalCost / addedQuantity) : currentUnitCost,
          note: note || `Restock/Adjust via POS`
      }]);

    if (logError) {
        console.error("Inventory log error:", logError);
    }

    return NextResponse.json(updatedIngredient);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
