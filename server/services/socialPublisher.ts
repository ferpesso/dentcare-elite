/**
 * Social Publisher Service
 * DentCare V33
 *
 * Publica conteúdo nas APIs reais das redes sociais.
 * Suporta: Instagram (Graph API v21.0), Facebook (Pages API v21.0),
 *          LinkedIn (Posts API v2), Google Business Profile
 *
 * V33 ATUALIZAÇÕES:
 * - Instagram/Facebook: v18.0 → v21.0 (versão estável atual)
 * - LinkedIn: UGC Posts API (deprecated) → Posts API v2
 * - Novo: Google Business Profile (posts e reviews)
 * - Novo: Suporte a Reels do Instagram
 * - Novo: Suporte a Carrossel do Instagram
 * - TikTok: mantido como stub (requer aprovação de app)
 */

interface PublicacaoInput {
  plataforma: string;
  tokenAcesso: string;
  idPlataforma: string;
  conteudo: string;
  imagens?: string[];
  tipo?: "post" | "reel" | "carrossel" | "story";
  videoUrl?: string;
}

interface ResultadoPublicacao {
  sucesso: boolean;
  idExterno?: string;
  erro?: string;
  aviso?: string;
}

// ─── Constantes de API ───────────────────────────────────────────────────────

const META_API_VERSION = "v21.0";
const META_GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}`;
const INSTAGRAM_GRAPH_URL = `https://graph.instagram.com/${META_API_VERSION}`;

// ─── Instagram Graph API v21.0 ──────────────────────────────────────────────

async function publicarInstagram(input: PublicacaoInput): Promise<ResultadoPublicacao> {
  try {
    const { tokenAcesso, idPlataforma, conteudo, imagens, tipo, videoUrl } = input;

    // Reel (vídeo curto)
    if (tipo === "reel" && videoUrl) {
      return await publicarInstagramReel(tokenAcesso, idPlataforma, conteudo, videoUrl);
    }

    // Carrossel (múltiplas imagens)
    if (tipo === "carrossel" && imagens && imagens.length > 1) {
      return await publicarInstagramCarrossel(tokenAcesso, idPlataforma, conteudo, imagens);
    }

    // Post com imagem única
    if (imagens && imagens.length > 0) {
      const mediaRes = await fetch(
        `${INSTAGRAM_GRAPH_URL}/${idPlataforma}/media`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_url: imagens[0],
            caption: conteudo,
            access_token: tokenAcesso,
          }),
        }
      );
      const mediaData = await mediaRes.json() as any;
      if (!mediaRes.ok || mediaData.error) {
        return { sucesso: false, erro: mediaData.error?.message || "Erro ao criar container de media no Instagram" };
      }

      // Publicar o container
      const publishRes = await fetch(
        `${INSTAGRAM_GRAPH_URL}/${idPlataforma}/media_publish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creation_id: mediaData.id,
            access_token: tokenAcesso,
          }),
        }
      );
      const publishData = await publishRes.json() as any;
      if (!publishRes.ok || publishData.error) {
        return { sucesso: false, erro: publishData.error?.message || "Erro ao publicar no Instagram" };
      }
      return { sucesso: true, idExterno: publishData.id };
    } else {
      return {
        sucesso: false,
        erro: "O Instagram não suporta posts apenas de texto. É necessário incluir pelo menos uma imagem.",
      };
    }
  } catch (err: any) {
    return { sucesso: false, erro: 'Erro de rede ao publicar no Instagram. Verifique a conexão.' };
  }
}

/**
 * Publicar Reel no Instagram (vídeo curto)
 */
async function publicarInstagramReel(
  tokenAcesso: string,
  idPlataforma: string,
  caption: string,
  videoUrl: string
): Promise<ResultadoPublicacao> {
  try {
    // Criar container de vídeo
    const containerRes = await fetch(
      `${INSTAGRAM_GRAPH_URL}/${idPlataforma}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_type: "REELS",
          video_url: videoUrl,
          caption,
          access_token: tokenAcesso,
          share_to_feed: true,
        }),
      }
    );
    const containerData = await containerRes.json() as any;
    if (!containerRes.ok || containerData.error) {
      return { sucesso: false, erro: containerData.error?.message || "Erro ao criar container de Reel" };
    }

    // Aguardar processamento do vídeo (polling)
    const containerId = containerData.id;
    let tentativas = 0;
    let pronto = false;

    while (tentativas < 30 && !pronto) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const statusRes = await fetch(
        `${INSTAGRAM_GRAPH_URL}/${containerId}?fields=status_code&access_token=${tokenAcesso}`
      );
      const statusData = await statusRes.json() as any;
      if (statusData.status_code === "FINISHED") {
        pronto = true;
      } else if (statusData.status_code === "ERROR") {
        return { sucesso: false, erro: "Erro no processamento do vídeo pelo Instagram" };
      }
      tentativas++;
    }

    if (!pronto) {
      return { sucesso: false, erro: "Timeout no processamento do vídeo. Tente novamente." };
    }

    // Publicar
    const publishRes = await fetch(
      `${INSTAGRAM_GRAPH_URL}/${idPlataforma}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: tokenAcesso,
        }),
      }
    );
    const publishData = await publishRes.json() as any;
    if (!publishRes.ok || publishData.error) {
      return { sucesso: false, erro: publishData.error?.message || "Erro ao publicar Reel" };
    }
    return { sucesso: true, idExterno: publishData.id };
  } catch (err: any) {
    return { sucesso: false, erro: 'Erro ao publicar Reel. Verifique a conexão.' };
  }
}

/**
 * Publicar Carrossel no Instagram (múltiplas imagens)
 */
async function publicarInstagramCarrossel(
  tokenAcesso: string,
  idPlataforma: string,
  caption: string,
  imagens: string[]
): Promise<ResultadoPublicacao> {
  try {
    // Criar containers individuais para cada imagem
    const containerIds: string[] = [];
    for (const imagemUrl of imagens.slice(0, 10)) { // Máximo 10 imagens
      const res = await fetch(
        `${INSTAGRAM_GRAPH_URL}/${idPlataforma}/media`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_url: imagemUrl,
            is_carousel_item: true,
            access_token: tokenAcesso,
          }),
        }
      );
      const data = await res.json() as any;
      if (data.id) containerIds.push(data.id);
    }

    if (containerIds.length < 2) {
      return { sucesso: false, erro: "São necessárias pelo menos 2 imagens para um carrossel." };
    }

    // Criar container do carrossel
    const carrosselRes = await fetch(
      `${INSTAGRAM_GRAPH_URL}/${idPlataforma}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_type: "CAROUSEL",
          children: containerIds,
          caption,
          access_token: tokenAcesso,
        }),
      }
    );
    const carrosselData = await carrosselRes.json() as any;
    if (!carrosselRes.ok || carrosselData.error) {
      return { sucesso: false, erro: carrosselData.error?.message || "Erro ao criar carrossel" };
    }

    // Publicar
    const publishRes = await fetch(
      `${INSTAGRAM_GRAPH_URL}/${idPlataforma}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: carrosselData.id,
          access_token: tokenAcesso,
        }),
      }
    );
    const publishData = await publishRes.json() as any;
    if (!publishRes.ok || publishData.error) {
      return { sucesso: false, erro: publishData.error?.message || "Erro ao publicar carrossel" };
    }
    return { sucesso: true, idExterno: publishData.id };
  } catch (err: any) {
    return { sucesso: false, erro: 'Erro ao publicar carrossel. Verifique a conexão.' };
  }
}

// ─── Facebook Pages API v21.0 ───────────────────────────────────────────────

async function publicarFacebook(input: PublicacaoInput): Promise<ResultadoPublicacao> {
  try {
    const { tokenAcesso, idPlataforma, conteudo, imagens } = input;

    const endpoint = imagens && imagens.length > 0
      ? `${META_GRAPH_URL}/${idPlataforma}/photos`
      : `${META_GRAPH_URL}/${idPlataforma}/feed`;

    const body: Record<string, string> = {
      message: conteudo,
      access_token: tokenAcesso,
    };
    if (imagens && imagens.length > 0) {
      body.url = imagens[0];
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json() as any;

    if (!res.ok || data.error) {
      return { sucesso: false, erro: data.error?.message || "Erro ao publicar no Facebook" };
    }
    return { sucesso: true, idExterno: data.id || data.post_id };
  } catch (err: any) {
    return { sucesso: false, erro: 'Erro de rede ao publicar no Facebook. Verifique a conexão.' };
  }
}

// ─── LinkedIn Posts API v2 (substitui UGC Posts API deprecated) ──────────────

async function publicarLinkedIn(input: PublicacaoInput): Promise<ResultadoPublicacao> {
  try {
    const { tokenAcesso, idPlataforma, conteudo, imagens } = input;

    // Nova Posts API v2 (substitui ugcPosts)
    const postBody: any = {
      author: `urn:li:person:${idPlataforma}`,
      commentary: conteudo,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
    };

    // Se tem imagem, fazer upload primeiro
    if (imagens && imagens.length > 0) {
      // Iniciar upload de imagem
      const initUploadRes = await fetch("https://api.linkedin.com/rest/images?action=initializeUpload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenAcesso}`,
          "LinkedIn-Version": "202401",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify({
          initializeUploadRequest: {
            owner: `urn:li:person:${idPlataforma}`,
          },
        }),
      });

      const initData = await initUploadRes.json() as any;

      if (initData.value?.uploadUrl && initData.value?.image) {
        // Descarregar a imagem e fazer upload para o LinkedIn
        const imageResponse = await fetch(imagens[0]);
        const imageBuffer = await imageResponse.arrayBuffer();

        await fetch(initData.value.uploadUrl, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${tokenAcesso}`,
            "Content-Type": "application/octet-stream",
          },
          body: imageBuffer,
        });

        // Adicionar imagem ao post
        postBody.content = {
          media: {
            title: "Publicação DentClinic Portugal",
            id: initData.value.image,
          },
        };
      }
    }

    // Publicar o post
    const res = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenAcesso}`,
        "LinkedIn-Version": "202401",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(postBody),
    });

    if (!res.ok) {
      const errorData = await res.json() as any;
      return { sucesso: false, erro: errorData.message || `LinkedIn retornou erro ${res.status}` };
    }

    // O ID do post vem no header X-RestLi-Id
    const postId = res.headers.get("X-RestLi-Id") || res.headers.get("x-restli-id");
    return { sucesso: true, idExterno: postId || undefined };
  } catch (err: any) {
    return { sucesso: false, erro: 'Erro de rede ao publicar no LinkedIn. Verifique a conexão.' };
  }
}

// ─── Google Business Profile (Novo V33) ─────────────────────────────────────

async function publicarGoogleBusiness(input: PublicacaoInput): Promise<ResultadoPublicacao> {
  try {
    const { tokenAcesso, idPlataforma, conteudo, imagens } = input;

    // Google Business Profile API v1
    const postBody: any = {
      languageCode: "pt-PT",
      summary: conteudo,
      topicType: "STANDARD",
    };

    // Adicionar imagem se disponível
    if (imagens && imagens.length > 0) {
      postBody.media = [{
        mediaFormat: "PHOTO",
        sourceUrl: imagens[0],
      }];
    }

    // Adicionar call-to-action (botão "Saber Mais" ou "Marcar Consulta")
    postBody.callToAction = {
      actionType: "BOOK",
      url: process.env.CLINIC_WEBSITE_URL || "https://dentclinic.pt",
    };

    const res = await fetch(
      `https://mybusiness.googleapis.com/v4/accounts/${idPlataforma}/locations/-/localPosts`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenAcesso}`,
        },
        body: JSON.stringify(postBody),
      }
    );

    const data = await res.json() as any;

    if (!res.ok || data.error) {
      return { sucesso: false, erro: data.error?.message || "Erro ao publicar no Google Business Profile" };
    }
    return { sucesso: true, idExterno: data.name };
  } catch (err: any) {
    return { sucesso: false, erro: `Erro ao publicar no Google Business: ${err.message}` };
  }
}

/**
 * Obter reviews do Google Business Profile
 */
export async function obterReviewsGoogle(
  tokenAcesso: string,
  accountId: string,
  locationId: string
): Promise<{ reviews: any[]; mediaEstrelas: number; total: number }> {
  try {
    const res = await fetch(
      `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews`,
      {
        headers: { Authorization: `Bearer ${tokenAcesso}` },
      }
    );
    const data = await res.json() as any;

    if (!res.ok) {
      return { reviews: [], mediaEstrelas: 0, total: 0 };
    }

    const reviews = data.reviews || [];
    const totalEstrelas = reviews.reduce((sum: number, r: any) => {
      const starMap: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
      return sum + (starMap[r.starRating] || 0);
    }, 0);

    return {
      reviews: reviews.slice(0, 20),
      mediaEstrelas: reviews.length > 0 ? totalEstrelas / reviews.length : 0,
      total: data.totalReviewCount || reviews.length,
    };
  } catch {
    return { reviews: [], mediaEstrelas: 0, total: 0 };
  }
}

// ─── TikTok (stub — requer aprovação de app) ─────────────────────────────────

function publicarTikTok(_input: PublicacaoInput): Promise<ResultadoPublicacao> {
  return Promise.resolve({
    sucesso: false,
    aviso: "A publicação no TikTok requer aprovação de aplicação pela TikTok. O post foi guardado localmente mas não foi publicado externamente. Configure TIKTOK_CLIENT_KEY e TIKTOK_CLIENT_SECRET e submeta a app para aprovação em developers.tiktok.com.",
  });
}

// ─── Dispatcher Principal ─────────────────────────────────────────────────────

export function publicarNaRedeSocial(input: PublicacaoInput): Promise<ResultadoPublicacao> {
  const plataforma = input.plataforma.toLowerCase();

  switch (plataforma) {
    case "instagram":
      return publicarInstagram(input);
    case "facebook":
      return publicarFacebook(input);
    case "linkedin":
      return publicarLinkedIn(input);
    case "google_business":
    case "google":
      return publicarGoogleBusiness(input);
    case "tiktok":
      return publicarTikTok(input);
    default:
      return Promise.resolve({ sucesso: false, erro: `Plataforma "${input.plataforma}" não suportada` });
  }
}
