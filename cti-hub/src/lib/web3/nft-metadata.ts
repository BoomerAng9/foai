/**
 * Web3-Ready Layer — NFT Metadata Schema for NURD Profile Cards
 *
 * This prepares the data structure for NFT minting. The actual blockchain
 * integration (contract deployment, minting, Unstoppable Domains) comes later.
 * Right now we make the data exportable and NFT-compatible.
 *
 * Follows ERC-721 metadata standard (OpenSea compatible).
 */

import type { NurdCardData } from '@/components/profile/NurdCard';

export interface NftMetadata {
  name: string;
  description: string;
  image: string;              // IPFS URI or data URI of the card render
  external_url: string;       // Link back to the platform profile
  attributes: NftAttribute[];
  properties: {
    category: 'identity';
    platform: 'deploy-platform';
    card_style: 'tech' | 'illustrated';
    created_at: string;
  };
}

export interface NftAttribute {
  trait_type: string;
  value: string | number;
  display_type?: 'number' | 'boost_number' | 'boost_percentage' | 'date';
}

/**
 * Convert a NURD card into NFT-compatible metadata.
 * Ready to be stored on IPFS and referenced by an NFT contract.
 */
export function cardToNftMetadata(card: NurdCardData, userId: string): NftMetadata {
  return {
    name: `${card.name} — NURD Card`,
    description: card.description,
    image: card.avatarUrl, // Will be replaced with IPFS URI when minting
    external_url: `https://cti.foai.cloud/profile/${userId}`,
    attributes: [
      { trait_type: 'Class', value: card.class },
      { trait_type: 'Level', value: card.level, display_type: 'number' },
      { trait_type: 'Core Trait', value: card.coreTrait },
      { trait_type: 'Vibe Ability', value: card.vibeAbility },
      { trait_type: 'Card Style', value: card.style },
      { trait_type: 'NURD Sync', value: card.syncStatus },
    ],
    properties: {
      category: 'identity',
      platform: 'deploy-platform',
      card_style: card.style,
      created_at: new Date().toISOString(),
    },
  };
}

/**
 * Estimate the mint cost based on the Charter Template pricing.
 * 300% markup on generation cost ($0.039 → ~$0.12-$0.16)
 */
export function estimateMintCost(): {
  generationCost: number;
  userPrice: number;
  markup: string;
} {
  return {
    generationCost: 0.039,
    userPrice: 0.15, // ~$0.15 per mint
    markup: '300%',
  };
}

/**
 * Check if a user's tier includes a free first mint.
 */
export function isFreeMintIncluded(tier: string): boolean {
  return ['starter', 'growth', 'enterprise'].includes(tier);
}

/**
 * Placeholder for future wallet connection.
 * Returns the data structure needed for Web3 integration.
 */
export interface Web3ReadyExport {
  metadata: NftMetadata;
  estimatedCost: ReturnType<typeof estimateMintCost>;
  freeMint: boolean;
  status: 'ready' | 'not-connected';
  message: string;
}

export function prepareForMint(card: NurdCardData, userId: string, tier: string): Web3ReadyExport {
  return {
    metadata: cardToNftMetadata(card, userId),
    estimatedCost: estimateMintCost(),
    freeMint: isFreeMintIncluded(tier),
    status: 'not-connected',
    message: 'Web3 wallet connection coming soon. Your card data is NFT-ready.',
  };
}
