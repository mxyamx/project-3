import { DropdownOption } from '@app/interfaces/dropdown-option';

export function optionFromValue<T extends string>(list: DropdownOption<T>[], v: T, fallback: DropdownOption<T>): DropdownOption<T> {
    return list.find((o) => o.value === v) ?? fallback;
}
