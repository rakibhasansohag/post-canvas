/** Options of `openFilePicker`. */
export interface FilePickerOptions {
  /** An `accept` string, such as `image/*`. */
  accept?: string;
  multiple?: boolean;
}

/**
 * Opens the device's file picker and resolves with the chosen files, or an empty list when it's closed. Call it from a
 * click or key press: browsers only open pickers for a user action.
 */
export function openFilePicker({ accept, multiple = false }: FilePickerOptions = {}): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    if (accept) input.accept = accept;
    input.multiple = multiple;
    input.tabIndex = -1;
    input.style.position = 'fixed';
    input.style.left = '-10000px';
    let settled = false;
    const finish = (files: File[]) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(files);
    };
    input.addEventListener('change', () => finish(Array.from(input.files ?? [])));
    input.addEventListener('cancel', () => finish([]));
    document.body.appendChild(input);
    input.click();
  });
}
