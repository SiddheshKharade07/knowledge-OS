import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors focus-ring disabled:pointer-events-none disabled:opacity-50 press-feedback',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-on-primary shadow-card hover:bg-[#4338ca]',
        secondary: 'bg-surface-container-lowest text-on-surface border border-outline-variant/70 shadow-card hover:bg-surface-container-low',
        ghost: 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
        outline: 'bg-surface-container-lowest text-on-surface border border-outline-variant/70 hover:bg-surface-container-low',
        subtle: 'bg-surface-container text-on-surface hover:bg-surface-container-high',
        destructive: 'bg-error text-on-error hover:bg-[#991b1b]',
      },
      size: {
        default: 'h-9 px-3.5',
        sm: 'h-8 px-2.5 text-xs',
        lg: 'h-10 px-4',
        icon: 'h-9 w-9',
        'icon-sm': 'h-8 w-8',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return <button className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
