import { ConfirmationDialogData } from '@app/interfaces/confirmation-dialog-date';

export const DELETE_CHANNEL_CONFIRM_DIALOG_DATA: ConfirmationDialogData = {
    title: 'dialog.delete-channel.title',
    text: 'dialog.delete-channel.text',
    cancelButtonLabel: 'dialog.delete-channel.cancel-button-label',
    confirmButtonLabel: 'dialog.delete-channel.confirm-button-label',
    confirmOnly: false,
};

export const JOIN_CHANNEL_CONFIRM_DIALOG_DATA: ConfirmationDialogData = {
    title: 'dialog.join-channel.title',
    text: 'dialog.join-channel.text',
    cancelButtonLabel: 'dialog.join-channel.cancel-button-label',
    confirmButtonLabel: 'dialog.join-channel.confirm-button-label',
    confirmOnly: false,
};

export const LEAVE_CHANNEL_CONFIRM_DIALOG_DATA: ConfirmationDialogData = {
    title: 'dialog.leave-channel.title',
    text: 'dialog.leave-channel.text',
    cancelButtonLabel: 'dialog.leave-channel.cancel-button-label',
    confirmButtonLabel: 'dialog.leave-channel.confirm-button-label',
    confirmOnly: false,
};

export const SERVER_ERROR_CONFIRM_DIALOG_DATA: ConfirmationDialogData = {
    title: 'dialog.server-error.title',
    text: 'dialog.server-error.server-errors.unknown',
    cancelButtonLabel: '',
    confirmButtonLabel: 'dialog.server-error.confirm-button-label',
    confirmOnly: true,
};
