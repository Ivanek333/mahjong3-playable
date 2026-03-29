export interface IManager {
  update?(deltaMS: number): void;
  destroy(): void;
}