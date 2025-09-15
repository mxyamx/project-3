import { ConfirmationDialogData } from '@app/interfaces/confirmation-dialog-date';

export const DELETE_CHANNEL_CONFIRM_DIALOG_DATA: ConfirmationDialogData = {
    title: 'Supprimer le canal ?',
    text: 'Cette action est irréversible. Voulez-vous continuer ?',
    cancelButtonLabel: 'Annuler',
    confirmButtonLabel: 'Supprimer',
};

export const JOIN_CHANNEL_CONFIRM_DIALOG_DATA: ConfirmationDialogData = {
    title: 'Rejoindre?',
    text: `Vous allez rejoindre ce canal. Vos nouveaux messages seront visibles par tous les membres.`,
    cancelButtonLabel: 'Annuler',
    confirmButtonLabel: 'Rejoindre',
};

export const LEAVE_CHANNEL_CONFIRM_DIALOG_DATA: ConfirmationDialogData = {
    title: 'Quitter le canal ?',
    text: `Vous allez quitter ce canal. Vous ne recevrez plus de messages, mais vous pourrez le rejoindre à nouveau.`,
    cancelButtonLabel: 'Annuler',
    confirmButtonLabel: 'Quitter',
};
