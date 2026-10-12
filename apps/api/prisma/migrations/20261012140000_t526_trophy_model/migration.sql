-- T526 — modelo 3D do troféu da competição (visualizador 360º).
-- O Commons hospeda apenas .stl (não glb/gltf) e NÃO tem modelo de nenhum troféu
-- real das competições do acervo (busca documentada em 12-10-2026) — o campo
-- existe para o primeiro modelo real que aparecer. ADITIVA e nullable.
ALTER TABLE "competitions" ADD COLUMN "trophyModel" JSONB;
