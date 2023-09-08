
import { Asset, AssetMetadata, BaseMetadataProvider, RequestConfig } from '@indigo-labs/dexter';
import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import { setupCache } from 'axios-cache-interceptor';


export class KoiosTokenRegistryProvider extends BaseMetadataProvider {

    private _api: AxiosInstance;
    private _requestConfig: RequestConfig;
    /**
     * https://input-output-hk.github.io/offchain-metadata-tools/api/latest/
     */
    constructor(requestConfig: RequestConfig = {}) {
        super();

        this._requestConfig = requestConfig;

        this._api = axios.create({
            timeout: requestConfig.timeout ?? 15000,
            baseURL: `${requestConfig.proxyUrl ?? ''}https://api.koios.rest/api/v0/`,
            headers: {
                'Content-Type': 'application/json',
            },
        });
        axiosRetry(this._api, {
            retries: requestConfig.retries,
            retryDelay: () => 10000,
            retryCondition: () => true,
        });

        this._api = setupCache(this._api);
    }

    fetch(assets: Asset[]): Promise<AssetMetadata[]> {
        let promises: any = [];
        try {
            for (let i = 0; i < assets.length; i++) {
                promises.push(this._api
                    .request({
                        method: "GET",
                        url: `/asset_info?_asset_policy=${assets[i].policyId}&_asset_name=${assets[i].nameHex}`,
                    }).then(response => response.data)
                    .then((data) => data.map((entry: any) => {
                        return {
                            policyId: entry.policy_id.toString(),
                            nameHex: entry.asset_name.toString(),
                            decimals: entry.token_registry_metadata.decimals ? Number(entry.token_registry_metadata.decimals) : 0,
                        } as AssetMetadata
                    })))
            }
            return Promise.resolve(promises);
        } catch (error) {
            return Promise.reject();
        }
    }
}
