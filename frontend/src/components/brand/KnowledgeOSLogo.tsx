import { useId, type SVGProps } from 'react';
import { cn } from '../../lib/utils';

export type KnowledgeOSLogoVariant = 'horizontal' | 'icon';

export interface KnowledgeOSLogoProps extends SVGProps<SVGSVGElement> {
  variant?: KnowledgeOSLogoVariant;
  size?: number;
  className?: string;
  showTagline?: boolean;
  iconSize?: number;
}

export function KnowledgeOSLogoMark({ size = 32, className, ...props }: { size?: number; className?: string } & SVGProps<SVGSVGElement>) {
  const gradientId = useId();
  const baseId = `knowledgeos-brain-gradient-${gradientId}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="KnowledgeOS logo"
      className={className}
      fill="none"
      {...props}
    >
      <defs>
        <linearGradient id={baseId} x1="8" y1="7" x2="40" y2="41" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="52%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
      </defs>

      <g fill={`url(#${baseId})`}>
        <path
          d="
            M23 7.5
            C20.2 5.8 16.5 6.1 13.8 8.2
            C10.8 10.5 9.6 14.1 10.3 17.5
            C7.8 19.3 6.8 22.2 7.6 25.1
            C8.1 27.1 9.4 28.8 11.2 29.9
            C10.4 33.7 12.1 37.2 15.2 39
            C18.1 40.7 21.1 39.9 23 37.9
            Z
          "
        />
        <path
          d="
            M25 7.5
            C27.8 5.8 31.5 6.1 34.2 8.2
            C37.2 10.5 38.4 14.1 37.7 17.5
            C40.2 19.3 41.2 22.2 40.4 25.1
            C39.9 27.1 38.6 28.8 36.8 29.9
            C37.6 33.7 35.9 37.2 32.8 39
            C29.9 40.7 26.9 39.9 25 37.9
            Z
          "
        />
      </g>

      <g stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.82">
        <path d="M17 13.5 C19.5 13.5 21 15.2 21 17.5 V20.5" />
        <path d="M13 22 H17.5 C19.5 22 21 23.5 21 25.5 V29" />
        <path d="M16 32 C18.5 32 20.5 33.2 21 35" />
        <path d="M31 13.5 C28.5 13.5 27 15.2 27 17.5 V20.5" />
        <path d="M35 22 H30.5 C28.5 22 27 23.5 27 25.5 V29" />
        <path d="M32 32 C29.5 32 27.5 33.2 27 35" />
      </g>

      <path d="M24 9.5 V36.5" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" opacity="0.95" />
    </svg>
  );
}

export function KnowledgeOSLogo({
  variant = 'horizontal',
  size = 32,
  className,
  showTagline = true,
  iconSize,
}: KnowledgeOSLogoProps) {
  const resolvedIconSize = iconSize ?? size;
  if (variant === 'icon') {
    return <KnowledgeOSLogoMark size={resolvedIconSize} className={className} />;
  }

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <KnowledgeOSLogoMark size={resolvedIconSize} />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold leading-tight">
          <span className="text-[#1E293B]">Knowledge</span>
          <span className="text-[#4F46E5]">OS</span>
        </p>
        {showTagline ? (
          <p className="truncate text-[11px] leading-tight text-[#475467]">Enterprise Knowledge Assistant</p>
        ) : null}
      </div>
    </div>
  );
}

export type KnowledgeOSBrandProps = {
  className?: string;
  iconSize?: number;
};

export function KnowledgeOSBrand({ className, iconSize = 36 }: KnowledgeOSBrandProps) {
  return (
    <div className={cn('inline-flex items-center gap-2.5', className)}>
      <KnowledgeOSLogoMark size={iconSize} aria-label="KnowledgeOS" />
      <span className="whitespace-nowrap text-[20px] font-semibold tracking-[-0.7px]">
        <span className="text-[#1E293B]">Knowledge</span>
        <span className="text-[#4F46E5]">OS</span>
      </span>
    </div>
  );
}

export default KnowledgeOSLogo;
