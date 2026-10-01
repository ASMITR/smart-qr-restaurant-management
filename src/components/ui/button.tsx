import * as React from "react";
import { cn } from "@/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "ghost" | "link" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}

const variantClasses = {
  default: "bg-gradient-to-b from-orange-500 to-orange-600 text-white shadow-md shadow-orange-200 hover:from-orange-600 hover:to-orange-700 active:scale-[0.98]",
  destructive: "bg-gradient-to-b from-red-500 to-red-600 text-white shadow-md shadow-red-200 hover:from-red-600 hover:to-red-700 active:scale-[0.98]",
  outline: "border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 shadow-sm active:scale-[0.98]",
  ghost: "hover:bg-gray-100 text-gray-700 active:scale-[0.98]",
  link: "text-orange-500 underline-offset-4 hover:underline",
  secondary: "bg-gray-100 text-gray-800 hover:bg-gray-200 shadow-sm active:scale-[0.98]",
};

const sizeClasses = {
  default: "h-10 px-5 py-2 text-sm",
  sm: "h-8 px-3 text-xs",
  lg: "h-12 px-7 text-base",
  icon: "h-10 w-10",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
