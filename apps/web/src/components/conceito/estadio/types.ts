/**
 * Contrato REAL de `GET /stadiums/:id` (apps/api/src/modules/stadiums/repository.ts).
 *
 * O select do repositório devolve exatamente estes campos — mais o `clubName` achatado do
 * vínculo com `Club`. Nada aqui é inventado: campo ausente é `null` na origem e a ficha
 * declara a lacuna no lugar de preencher.
 */
export interface Estadio {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  capacity: number | null;
  surface: string | null;
  latitude: number | null;
  longitude: number | null;
  clubId: string | null;
  clubName: string | null;
  sourceUrl: string | null;
}
