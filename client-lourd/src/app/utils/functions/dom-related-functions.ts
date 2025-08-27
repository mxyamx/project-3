export function restrictEvent(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
}
