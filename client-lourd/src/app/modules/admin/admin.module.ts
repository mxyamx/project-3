import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminPageComponent } from '@app/pages/admin-page/admin-page.component';

@NgModule({
    imports: [CommonModule, FormsModule, AdminPageComponent],
})
export class AdminModule {}
