declare module '@js/boxy-navbar.esm' {
  interface NavbarAPI {
    start(config: {
      activeClass?: string;
    }): void;
    init(): void;
  }

  const BoxyNavbar: NavbarAPI;
  export default BoxyNavbar;
}
