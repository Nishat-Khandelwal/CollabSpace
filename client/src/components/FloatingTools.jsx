import { Pencil, MousePointer2, Square, ArrowRight } from "lucide-react";

export default function FloatingTools() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">

      <Pencil className="absolute top-[10%] left-[15%] text-white opacity-30 w-12 h-12 animate-float" />

      <MousePointer2 className="absolute top-[30%] right-[20%] text-white opacity-30 w-14 h-14 animate-float2" />

      <Square className="absolute bottom-[20%] left-[25%] text-white opacity-30 w-12 h-12 animate-float3" />

      <ArrowRight className="absolute bottom-[15%] right-[30%] text-white opacity-30 w-12 h-12 animate-float4" />

    </div>
  );
}