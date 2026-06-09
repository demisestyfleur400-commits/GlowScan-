declare module "html2pdf.js" {
  interface Worker {
    set(options: Record<string, unknown>): Worker;
    from(element: HTMLElement | string): Worker;
    save(): Promise<void>;
    output(type: "blob"): Promise<Blob>;
    output(type: "datauristring"): Promise<string>;
    output(type: string): Promise<unknown>;
    toPdf(): Worker;
  }
  function html2pdf(): Worker;
  export default html2pdf;
}
