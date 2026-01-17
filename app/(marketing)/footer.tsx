import { ReactNode } from "react";

export const Footer = ({ children }: { children?: ReactNode }) => {
  const curveStyle = {
    clipPath: "ellipse(85% 100% at 50% 100%)",
  };
  const curveStyleBg = {
    clipPath: "ellipse(120% 95% at 50% 98%)",
  };

  return (
    <div className="w-full h-[88px] bg-rose-500/50 flex items-end" style={curveStyleBg}>
      <footer className="flex justify-center items-center h-[80px] w-full bg-rose-400 px-4" style={curveStyle}>
        {children}
      </footer>
    </div>
  );
}