interface PageTitleProps {
  title: string;
  description?: string;
}
interface PageTitleProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageTitle({ title, description, children }: PageTitleProps) {
  return (
    <>
      <div className="flex justify-between items-center gap-5 my-5">
        <div className="w-lg">
          <h1 className="text-3xl font-display tracking-wider mb-1">{title}</h1>
          {description && (
            <p className=" text-muted-foreground">{description}</p>
          )}
        </div>
        {children && <div>{children}</div>}
      </div>
    </>
  );
}
