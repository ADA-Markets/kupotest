
import { Asset, BaseDataProvider, Dexter, DexterConfig, KupoProvider, LiquidityPool, Minswap, MuesliSwap, RequestConfig, SundaeSwap, Token, VyFinance, WingRiders } from '@indigo-labs/dexter';
import { NextResponse } from 'next/server'
import { KoiosTokenRegistryProvider } from './KoiosTokenRegistryProvider';
//POST INPUT
// {
//     "sellCoin": {
//       "policyId": "lovelace",
//       "nameHex": "",
//       "decimals": 0
//     },
//     "buyCoin": {
//       "policyId": "1d7f33bd23d85e1a25d87d86fac4f199c3197a2f7afeb662a0f34e1e",
//       "nameHex": "776f726c646d6f62696c65746f6b656e",
//       "decimals": 6
//     }
//   }


export interface PoolLookup {
    sellCoin: {
        policyId: string,
        nameHex: string,
        decimals: number
      },
      buyCoin: {
        policyId: string,
        nameHex: string,
        decimals: number
      }
}

export async function POST(request: Request) {

    try {
        const requestObj: Partial<PoolLookup> = await request.json();
        if (requestObj.sellCoin && requestObj.buyCoin && requestObj.sellCoin.policyId != '' && requestObj.buyCoin.policyId != '') {

            let sellToken: Token;
            let buyToken: Token;
            if (requestObj.sellCoin.policyId === 'lovelace') {
                sellToken = 'lovelace'
            } else {
                sellToken = new Asset(requestObj.sellCoin.policyId, requestObj.sellCoin.nameHex, requestObj.sellCoin.decimals)
            }

            if (requestObj.buyCoin.policyId === 'lovelace') {
                buyToken = 'lovelace'
            } else {
                buyToken = new Asset(requestObj.buyCoin.policyId, requestObj.buyCoin.nameHex, requestObj.buyCoin.decimals);
            }

            const dexterBfrost: Dexter = getDexter();
            const dexs: string[] = [SundaeSwap.identifier, Minswap.identifier, WingRiders.identifier,
            MuesliSwap.identifier, VyFinance.identifier];

            const liquidityPoolPromises: Promise<LiquidityPool[]>[] =
            dexs.map((dex) => {
                return dexterBfrost.newFetchRequest().onDexs(dex)
                    .forTokenPairs([[sellToken, buyToken]]).getLiquidityPools();
            })

        let liquidityPoolsPromises: LiquidityPool[][] = await Promise.all(liquidityPoolPromises);
        let liquidityPools: LiquidityPool[] = liquidityPoolsPromises.flat()
            //CREATE RESPONSE
            if (liquidityPools.length > 0) {
                let liquidityPoolsForPairJSON = JSON.stringify(liquidityPools, (key, value) =>
                    typeof value === 'bigint'
                        ? value.toString()
                        : value // return everything else unchanged
                )
                

                return NextResponse.json({
                    data: JSON.parse(liquidityPoolsForPairJSON),
                    error: null,
                });
            } else {
                return NextResponse.json({
                    error: "invalid response from dexter"
                });
            }
        }
    } catch (error) {
        console.error(error)
        return NextResponse.json({
            error: "Exception occured retry later"
        });
    }

}


export const getDexter = (): Dexter => {
    const dexterConfig: DexterConfig = {
      shouldFetchMetadata: true,      // Whether to fetch asset metadata (Best to leave this `true` for accurate pool info)
      shouldFallbackToApi: true,      // Only use when using Blockfrost or Kupo as data providers. On failure, fallback to the DEX API to grab necessary data
      shouldSubmitOrders: false,      // Allow Dexter to submit orders from swap requests. Useful during development
      metadataMsgBranding: 'ADAMarkets',  // Prepend branding name in Tx message
    };
    const requestConfig: RequestConfig = {
      timeout: 15000,  // How long outside network requests have to reply
      proxyUrl: '',   // URL to prepend to all outside URLs. Useful when dealing with CORs
      retries: 10,     // Number of times to reattempt any outside request
    };
    // url: 'https://smashpeek.com/kupo'
    const dataProvider: BaseDataProvider = new KupoProvider(
      {
        url: ''
      }
    );
  
    return new Dexter(dexterConfig, requestConfig).withDataProvider(dataProvider).withMetadataProvider(new KoiosTokenRegistryProvider(requestConfig));;
  }