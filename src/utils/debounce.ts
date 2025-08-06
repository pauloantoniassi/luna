let timeouts = new Map<string, NodeJS.Timeout>();

export default function debounce(func: Function, delay: number, id: string) {
  if (timeouts.has(id)) {
    clearTimeout(timeouts.get(id));
  }

  timeouts.set(
    id,
    setTimeout(() => {
      func();
    }, delay)
  );
}
