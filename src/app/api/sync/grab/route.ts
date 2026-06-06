import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = body.payload;

    if (!payload || !payload.order || !payload.order.itemInfo) {
      return NextResponse.json(
        { success: true, message: "Ignored (Not an order)" },
        { headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    const grabOrder = payload.order;
    const grabID = grabOrder.displayID || grabOrder.orderID;
    
    const queuePath = path.join(process.cwd(), "grab_queue.json");
    let queue: any[] = [];
    if (fs.existsSync(queuePath)) {
      try {
        queue = JSON.parse(fs.readFileSync(queuePath, "utf-8"));
      } catch (e) {}
    }

    // Check if already in queue
    if (queue.some(q => q.grabID === grabID)) {
      return NextResponse.json(
        { success: true, message: "Already in queue" },
        { headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    const items = grabOrder.itemInfo.items.map((item: any) => {
      let size = "M";
      let sugar = "100%";
      let ice = "Bình thường";
      let milk = undefined;
      const toppings: string[] = [];

      item.modifierGroups?.forEach((group: any) => {
        const groupName = group.modifierGroupName.toLowerCase();
        group.modifiers?.forEach((mod: any) => {
          const modName = mod.modifierName;
          if (groupName.includes("cỡ") || groupName.includes("size")) {
            size = modName;
          } else if (groupName.includes("đá") || groupName.includes("ice")) {
            ice = modName;
          } else if (groupName.includes("ngọt") || groupName.includes("sugar")) {
            sugar = modName;
          } else if (groupName.includes("sữa") || groupName.includes("milk")) {
            milk = modName;
          } else {
            toppings.push(modName);
          }
        });
      });

      return {
        name: item.name,
        quantity: item.quantity || 1,
        size, sugar, ice, milk, toppings,
        note: item.comment || ""
      };
    });

    const newJob = {
      id: Date.now().toString(),
      grabID: grabID,
      driverName: grabOrder.driver?.name || "Tài xế Grab",
      eaterName: grabOrder.eater?.name || "Khách Grab",
      items: items,
      createdAt: new Date().toISOString(),
      printed: false
    };

    queue.push(newJob);
    fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2));

    return NextResponse.json(
      { success: true, message: `Queued Grab Order ${grabID}` },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (err: any) {
    console.error("Grab Sync Error:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}
