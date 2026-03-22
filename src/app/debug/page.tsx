"use client";
import { useEffect, useState } from "react";

export default function DebugPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const check = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/orders");
      const orders = await res.json();
      
      const details = await Promise.all(orders.map(async (o: any) => {
        const dRes = await fetch(`/api/orders/${o.id}`);
        const dData = await dRes.json();
        return { order: o, items: dData.items };
      }));
      
      setData(details);
    } catch (e: any) {
      setData({ error: e.message });
    }
    setLoading(false);
  };

  return (
    <div className="p-10 font-mono text-xs">
      <button onClick={check} className="bg-primary text-white p-4 rounded mb-10">Check DB Integrity</button>
      {loading && <p>Checking...</p>}
      <pre className="bg-black text-green-400 p-10 overflow-auto max-h-[80vh]">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
