import { ReactNode } from "react";
import { theme } from "@/lib/theme";
import SectionHeader from "./SectionHeader";

interface SectionProps {
  children: ReactNode;
  title?: string;
  description?: string;
  headerSize?: "large" | "medium" | "small";
  showTopBorder?: boolean;
  showBottomBorder?: boolean;
  titleAdornment?: ReactNode;
}

export default function Section({
  children,
  title,
  description,
  headerSize = "large",
  showTopBorder = true,
  showBottomBorder = false,
  titleAdornment,
}: SectionProps) {
  return (
    <>
      {showTopBorder && (
        <div className="w-full border-t" style={{ borderColor: theme.borderGray }} />
      )}
      <div className="px-4 sm:px-6 py-12">
        {title && (
          <SectionHeader
            title={title}
            description={description}
            size={headerSize}
            titleAdornment={titleAdornment}
          />
        )}
        {children}
      </div>
      {showBottomBorder && (
        <div className="w-full border-t" style={{ borderColor: theme.borderGray }} />
      )}
    </>
  );
}
