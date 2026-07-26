import React from 'react';

type WorkspaceLayoutProps = {
  header: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  canvasWrapperRef?: React.RefObject<HTMLDivElement | null>;
  className?: string;
  maxWidthClassName?: string;
  centered?: boolean;
};

export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
  header,
  footer,
  children,
  canvasWrapperRef,
  className,
  maxWidthClassName = 'max-w-[1024px]',
  centered = true,
}) => (
  <div
    className={`flex flex-col flex-1 min-h-0 w-full ${maxWidthClassName} ${centered ? 'mx-auto' : ''} ${className ?? ''}`.trim()}
  >
    {header}
    <div ref={canvasWrapperRef} className="flex-1 min-h-0 flex flex-col">
      {children}
    </div>
    {footer}
  </div>
);
