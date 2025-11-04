import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { ClickOutsideDirective } from '@app/directives/click-outside.directive';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'app-dropdown',
    standalone: true,
    imports: [CommonModule, TranslatePipe, ClickOutsideDirective],
    templateUrl: './dropdown.component.html',
    styleUrl: './dropdown.component.scss',
})
export class DropdownComponent {
    menuOpen: boolean = false;
    @ViewChild('listElem') listElem: ElementRef;
    @Input() listElems: string[] = [];
    @Input() selectedValue: string;
    @Input() i18nKey: string;
    @Output() selectedValueChange = new EventEmitter<string>();

    toggleMenu() {
        this.menuOpen = !this.menuOpen;
        this.listElem.nativeElement.classList.toggle('show-menu');
    }

    clickHandler(item: string) {
        this.selectedValue = item;
        this.selectedValueChange.emit(item);
        this.toggleMenu();
    }
    clickedOutside(): void {
        this.menuOpen = false;
    }
}
