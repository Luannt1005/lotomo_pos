import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const queuePath = path.join(process.cwd(), "grab_queue.json");

export async function GET() {
  try {
    if (!fs.existsSync(queuePath)) {
      return NextResponse.json([]);
    }
    const queue = JSON.parse(fs.readFileSync(queuePath, "utf-8"));
    const unprinted = queue.filter((q: any) => !q.printed);
    return NextResponse.json(unprinted);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id } = await request.json();
    if (!fs.existsSync(queuePath)) {
      return NextResponse.json({ error: "Queue not found" }, { status: 404 });
    }
    const queue = JSON.parse(fs.readFileSync(queuePath, "utf-8"));
    const idx = queue.findIndex((q: any) => q.id === id);
    if (idx !== -1) {
      queue[idx].printed = true;
      fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2));
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
