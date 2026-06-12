declare module "content-hash" {
  const contentHash: {
    encode(codec: string, value: string): string;
  };

  export default contentHash;
}
