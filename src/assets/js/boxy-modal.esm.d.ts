declare module '@js/boxy-modal.esm' {
  interface ModalAPI {
    init(): void;
    close(id: string): Promise<boolean>;
    open(id: string): Promise<boolean>;
  }

  const BoxyModal: ModalAPI;
  export default BoxyModal;
}
