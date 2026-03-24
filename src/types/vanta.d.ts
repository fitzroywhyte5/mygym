declare module "vanta/dist/vanta.halo.min" {
  type VantaEffect = { destroy: () => void };
  const HALO: (opts: Record<string, unknown>) => VantaEffect;
  export default HALO;
}

declare module "vanta/dist/vanta.birds.min" {
  type VantaEffect = { destroy: () => void };
  const BIRDS: (opts: Record<string, unknown>) => VantaEffect;
  export default BIRDS;
}

declare module "vanta/dist/vanta.net.min" {
  type VantaEffect = { destroy: () => void };
  const NET: (opts: Record<string, unknown>) => VantaEffect;
  export default NET;
}
