import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { DropdownOption } from '@app/interfaces/dropdown-option';

@Component({
    selector: 'app-dropdown',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './dropdown.component.html',
    styleUrl: './dropdown.component.scss',
})
export class DropdownComponent<T extends string = string> {
    menuOpen: boolean = false;
    @ViewChild('listElem') listElem: ElementRef;
    @Input() listElems: DropdownOption<T>[] = [];
    @Input() selectedValue: DropdownOption<T> = { value: '' as T, viewValue: '' };
    @Output() selectedValueChange = new EventEmitter<DropdownOption<T>>();

    toggleMenu() {
        this.menuOpen = !this.menuOpen;
        this.listElem.nativeElement.classList.toggle('show-menu');
    }

    clickHandler(item: DropdownOption<T>) {
        this.selectedValue = item;
        this.selectedValueChange.emit(item);
        this.toggleMenu();
    }
}
