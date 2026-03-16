import React, { createContext, useContext, useRef, useState } from "react";
import { cn } from "../../lib/utils";

const MouseContext = createContext();

export const CardContainer = ({ children, containerClassName = "" }) => {
  const ref = useRef(null);
  const [hover, setHover] = useState(false);

  const handleMouseMove = (e) => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / 20;
    const y = (e.clientY - rect.top - rect.height / 2) / 20;

    ref.current.style.transform = `rotateY(${x}deg) rotateX(${-y}deg)`;
  };

  const reset = () => {
    if (!ref.current) return;
    ref.current.style.transform = "rotateY(0deg) rotateX(0deg)";
  };

  return (
    <MouseContext.Provider value={hover}>
      <div
        className={`flex items-center justify-center ${containerClassName}`}
        style={{ perspective: "1200px" }}
      >
        <div
          ref={ref}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => {
            setHover(false);
            reset();
          }}
          style={{
            transformStyle: "preserve-3d",
            transition: "transform 0.15s ease",
          }}
        >
          {children}
        </div>
      </div>
    </MouseContext.Provider>
  );
};

export const CardBody = ({ children, className = "" }) => {
  return (
    <div
      className={className}
      style={{
        transformStyle: "preserve-3d",
      }}
    >
      {children}
    </div>
  );
};

export const CardItem = ({ children, translateZ = 0, className = "" }) => {
  const hover = useContext(MouseContext);

  return (
    <div
      className={className}
      style={{
        transform: hover ? `translateZ(${translateZ}px)` : "translateZ(0px)",
        transition: "transform 0.2s ease",
      }}
    >
      {children}
    </div>
  );
};