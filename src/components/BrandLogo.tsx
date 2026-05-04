import logo from "@/assets/superior-logo.png";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  textClassName?: string;
  subtitle?: string;
  subtitleClassName?: string;
}

export const BrandLogo = ({
  size = 32,
  className,
  showText = true,
  textClassName,
  subtitle,
  subtitleClassName,
}: BrandLogoProps) => {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <img
        src={logo}
        alt="Superior Group of Colleges logo"
        width={size}
        height={size}
        loading="lazy"
        style={{ width: size, height: size }}
        className="object-contain shrink-0"
      />
      {showText && (
        <div className="leading-tight">
          <div className={cn("font-bold tracking-tight", textClassName)}>
            Superior Group of Colleges
          </div>
          {subtitle && (
            <div className={cn("text-xs opacity-70", subtitleClassName)}>
              {subtitle}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BrandLogo;
