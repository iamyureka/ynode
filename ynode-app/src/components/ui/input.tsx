import * as React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { }

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={`w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground 
                    outline-none ring-0 focus:ring-0 focus:ring-ring focus:outline-none focus:border-ring transition-all
                    autofill:bg-background autofill:text-foreground
                    [&:-webkit-autofill]:!bg-background 
                    [&:-webkit-autofill]:!border-border
                    [&:-webkit-autofill]:!outline-none
                    [&:-webkit-autofill]:!ring-0
                    [&:-webkit-autofill]:!text-foreground 
                    [&:-webkit-autofill]:[-webkit-text-fill-color:white] 
                    [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_hsl(var(--background))_inset]
                    [&:-webkit-autofill:hover]:[box-shadow:0_0_0_1000px_hsl(var(--background))_inset]
                    [&:-webkit-autofill:focus]:[box-shadow:0_0_0_1000px_hsl(var(--background))_inset]
                    [&:-webkit-autofill:focus]:!border-ring
                    ${className || ''}`}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
