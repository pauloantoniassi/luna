let timeoutId: NodeJS.Timeout;

export default function debounce(func: Function, delay: number, ...args: any[]) {
  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  timeoutId = setTimeout(() => {
    func(...args);
  }, delay);
}
