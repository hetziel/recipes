const apiDolarApi = 'https://ve.dolarapi.com/v1/dolares';


export interface ExchangeRates {
  usdOficial: number | null;
  usdParalelo: number | null;
  date: string | null;
}

interface DolarApiEntry {
  fuente: string;
  promedio: number;
  valor: number;
  fechaActualizacion: string;
}

export async function getExchangeRates(): Promise<ExchangeRates> {
  const result: ExchangeRates = {
    usdOficial: null,
    usdParalelo: null,
    date: null,
  };

  try {
    const response = await fetch(apiDolarApi, { cache: 'no-store', headers: { 'Accept': 'application/json' } });

    if (response.ok) {
      const dolarData: DolarApiEntry[] = await response.json();
      const oficial = dolarData.find((d: DolarApiEntry) => d.fuente === 'oficial');
      const paralelo = dolarData.find((d: DolarApiEntry) => d.fuente === 'paralelo');

      if (oficial) {
        result.usdOficial = oficial.promedio || oficial.valor;
        result.date = oficial.fechaActualizacion;
      }
      if (paralelo) {
        result.usdParalelo = paralelo.promedio || paralelo.valor;
        if (!result.date || (paralelo.fechaActualizacion && new Date(paralelo.fechaActualizacion) > new Date(result.date))) {
          result.date = paralelo.fechaActualizacion;
        }
      }
    } else {
      console.error(`Error fetching dolar rates: HTTP ${response.status}`);
    }


    return result;

  } catch (error) {
    console.error('Error fetching exchange rates:', error);

    console.warn('No cached exchange rates available.');
    return result;
  }
}
