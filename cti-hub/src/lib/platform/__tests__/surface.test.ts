import {
  getBrandConfig,
  getBrandConfigFromHostname,
  surfaceFromHostname,
} from '@/lib/platform/surface';

describe('platform surface resolution', () => {
  it('resolves CTI hosts to the CTI surface', () => {
    expect(surfaceFromHostname('cti.foai.cloud')).toBe('cti');
    expect(surfaceFromHostname('cti.localhost:3000')).toBe('cti');
  });

  it('resolves deploy hosts to the deploy surface', () => {
    expect(surfaceFromHostname('deploy.foai.cloud')).toBe('deploy');
    expect(surfaceFromHostname('deploy.localhost:3000')).toBe('deploy');
  });

  it('defaults localhost development to CTI and unknown hosts to deploy', () => {
    expect(surfaceFromHostname('localhost:3000')).toBe('cti');
    expect(surfaceFromHostname('127.0.0.1:3000')).toBe('cti');
    expect(surfaceFromHostname('foai.cloud')).toBe('deploy');
    expect(surfaceFromHostname(null)).toBe('deploy');
  });

  it('returns host-specific brand config and route paths', () => {
    const cti = getBrandConfig('cti');
    const deploy = getBrandConfig('deploy');

    expect(cti.systemName).toBe('CTI Hub');
    expect(cti.homePath).toBe('/chat');
    expect(cti.billingPath).toBeNull();
    expect(cti.ownerHubUrl).toBeNull();

    expect(deploy.systemName).toBe('The Deploy Platform');
    expect(deploy.homePath).toBe('/deploy-landing');
    expect(deploy.billingPath).toBe('/billing');
    expect(deploy.ownerHubUrl).toBe('https://cti.foai.cloud');
  });

  it('derives brand config directly from the hostname', () => {
    expect(getBrandConfigFromHostname('cti.foai.cloud')).toEqual(getBrandConfig('cti'));
    expect(getBrandConfigFromHostname('deploy.foai.cloud')).toEqual(getBrandConfig('deploy'));
  });
});
