const apiExchangeRates = 'https://api.dolarvzla.com/public/exchange-rate';

export async function getExchangeRates() {
    try {
        const response = await fetch(apiExchangeRates, {
            cache: 'no-store',
            headers: {
                'Accept': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();

        return data.current;
    } catch (error) {
        console.error('Error fetching exchange rates:', error);
        throw error;
    }
}