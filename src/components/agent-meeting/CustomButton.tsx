import React from "react";

interface ButtonProps {
  text: string;
  thickBorder?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  gradient?: boolean;
  customGradient?: string;
  borderColor?: string;
  borderWidth?: string;
  borderRadius?: string;
}

export const CustomButton: React.FC<ButtonProps> = ({
  text,
  thickBorder = false,
  onClick,
  disabled = false,
  gradient = false,
  customGradient,
  borderColor,
  borderWidth,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={
        `box-border px-9 py-7 text-xl font-medium leading-8 text-center text-white whitespace-nowrap transition-all cursor-pointer duration-[0.2s] ease-[ease-in-out] flex items-center justify-center
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        max-md:px-8 max-md:py-6 max-md:h-14 max-md:text-lg max-md:w-[200px]
        max-sm:px-7 max-sm:py-5 max-sm:text-base max-sm:h-[52px] max-sm:w-[240px]` +
        (gradient ? " bg-gradient-to-r border-none" : " bg-rose-400")
      }
      style={{
        width: "240px",
        height: "62px",
        background: gradient
          ? customGradient ||
            "linear-gradient(90deg, #F96E8C 0%, #DE4CE3 49%, #6A65F3 100%)"
          : undefined,
        border:
          borderColor && borderWidth
            ? `${borderWidth} solid ${borderColor}`
            : thickBorder
            ? "6px solid #864059"
            : "1.5px solid #F96E8C",
        borderRadius: "160px",
        ...(gradient || customGradient
          ? {
              border:
                borderColor && borderWidth
                  ? `${borderWidth} solid ${borderColor}`
                  : thickBorder
                  ? "6px solid #864059"
                  : "1.5px solid #F96E8C",
            }
          : {}),
      }}
    >
      {text}
    </button>
  );
};
