export interface VisionResult {
  tipo: string;
  achados: Array<{
    dente: string;
    patologia: string;
    severidade: "leve" | "moderada" | "critica";
    confianca: number;
  }>;
  sugestaoTratamento: string[];
  odontogramaGerado: boolean;
}

export const iaVisionService = {
  async analisarRadiografia(imagemBase64: string): Promise<VisionResult> {
    return {
      tipo: "Radiografia Panorâmica",
      achados: [],
      sugestaoTratamento: [],
      odontogramaGerado: true,
    };
  },
};
