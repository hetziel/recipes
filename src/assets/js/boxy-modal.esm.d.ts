declare module '@js/boxy-modal.esm' {
  interface ModalAPI {
    init(): void;
    closePopupScreen(id: string): Promise<boolean>;
  }

  const BoxyModal: ModalAPI;
  export default BoxyModal;
}
