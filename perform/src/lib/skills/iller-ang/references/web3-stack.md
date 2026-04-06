# Web3 Stack Reference — Iller_Ang

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                    ILLER_ANG WEB3 STACK                   │
├──────────────┬──────────────┬──────────────┬─────────────┤
│  FRONTEND    │  WALLET      │  CONTRACT    │  STORAGE    │
│  React+Vite  │  wagmi+viem  │  ethers/viem │  IPFS/Arweave│
│  Tailwind    │  RainbowKit  │  ERC-721     │  Pinata     │
│  Framer      │  ConnectKit  │  ERC-1155    │  nft.storage│
└──────────────┴──────────────┴──────────────┴─────────────┘
```

## Mint Page — Standard Implementation

### Dependencies
```json
{
  "wagmi": "^2.x",
  "viem": "^2.x",
  "@rainbow-me/rainbowkit": "^2.x",
  "@tanstack/react-query": "^5.x",
  "ethers": "^6.x"
}
```

### Wallet Provider Setup
```jsx
// providers.jsx
import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet, polygon, base } from 'wagmi/chains';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const config = getDefaultConfig({
  appName: 'ACHIEVEMOR NFT',
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID',
  chains: [mainnet, polygon, base],
});

const queryClient = new QueryClient();

export const Providers = ({ children }) => (
  <WagmiProvider config={config}>
    <QueryClientProvider client={queryClient}>
      <RainbowKitProvider theme={darkTheme()}>
        {children}
      </RainbowKitProvider>
    </QueryClientProvider>
  </WagmiProvider>
);
```

### Mint Component Pattern
```jsx
// MintSection.jsx
import { useAccount, useWriteContract, useReadContract } from 'wagmi';
import { parseEther } from 'viem';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const CONTRACT_ADDRESS = '0x...';
const ABI = [/* contract ABI */];

const MintSection = ({ price = '0.08', maxSupply = 5000 }) => {
  const { address, isConnected } = useAccount();
  const [quantity, setQuantity] = useState(1);
  
  // Read total supply
  const { data: totalSupply } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'totalSupply',
  });
  
  // Write mint function
  const { writeContract, isPending, isSuccess, isError } = useWriteContract();
  
  const handleMint = () => {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'mint',
      args: [BigInt(quantity)],
      value: parseEther((Number(price) * quantity).toString()),
    });
  };
  
  const minted = totalSupply ? Number(totalSupply) : 0;
  const progress = (minted / maxSupply) * 100;
  
  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-3xl p-8 backdrop-blur-xl">
        <h3 className="font-display text-3xl text-white mb-6">Mint Your Card</h3>
        
        {/* Supply Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-white/40 mb-2">
            <span>{minted} minted</span>
            <span>{maxSupply} total</span>
          </div>
          <div className="h-3 bg-white/[0.06] rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-yellow-400 via-pink-500 to-cyan-400 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        
        {/* Price */}
        <div className="text-center mb-6">
          <span className="text-4xl font-bold text-white">{price} ETH</span>
          <span className="block text-white/30 text-sm mt-1">per card</span>
        </div>
        
        {/* Quantity Selector */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <button 
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="w-10 h-10 rounded-full bg-white/[0.06] text-white hover:bg-white/[0.1] transition"
          >
            -
          </button>
          <span className="text-2xl font-bold text-white w-12 text-center">{quantity}</span>
          <button 
            onClick={() => setQuantity(Math.min(10, quantity + 1))}
            className="w-10 h-10 rounded-full bg-white/[0.06] text-white hover:bg-white/[0.1] transition"
          >
            +
          </button>
        </div>
        
        {/* Total */}
        <div className="text-center text-white/40 text-sm mb-6">
          Total: {(Number(price) * quantity).toFixed(2)} ETH
        </div>
        
        {/* Mint / Connect Button */}
        {isConnected ? (
          <button
            onClick={handleMint}
            disabled={isPending}
            className="w-full py-4 rounded-full bg-gradient-to-r from-yellow-400 via-pink-500 to-cyan-400 text-black font-bold text-lg hover:shadow-[0_0_40px_rgba(255,0,255,0.3)] transition disabled:opacity-50"
          >
            {isPending ? 'Minting...' : `Mint ${quantity} Card${quantity > 1 ? 's' : ''}`}
          </button>
        ) : (
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <button
                onClick={openConnectModal}
                className="w-full py-4 rounded-full bg-white/[0.06] border border-cyan-400/30 text-cyan-400 font-bold text-lg hover:bg-white/[0.1] transition"
              >
                Connect Wallet to Mint
              </button>
            )}
          </ConnectButton.Custom>
        )}
        
        {/* Status Messages */}
        {isSuccess && (
          <p className="text-green-400 text-sm text-center mt-4">
            Minted successfully! Check your wallet.
          </p>
        )}
        {isError && (
          <p className="text-red-400 text-sm text-center mt-4">
            Minting failed. Please try again.
          </p>
        )}
      </div>
    </div>
  );
};
```

## NFT Collection Generator

### Trait System
```javascript
// traits.js — Define collection traits and rarity weights

const TRAITS = {
  background: {
    'Dark Void': 30,      // 30% weight
    'Neon Grid': 20,
    'Stadium Lights': 15,
    'Holographic': 10,
    'Gold Foil': 5,
  },
  border: {
    'Standard Silver': 40,
    'Chrome': 25,
    'Holographic': 15,
    'Gold': 10,
    'Prismatic': 5,
    'Diamond': 3,
    'Mythic Fire': 2,
  },
  team: {
    // Weighted by collection focus
  },
  position: {
    'QB': 15, 'RB': 15, 'WR': 20, 'TE': 10,
    'OL': 10, 'DL': 10, 'LB': 10, 'DB': 10,
  },
  specialEdition: {
    'None': 85,
    'Rookie': 8,
    'All-Conference': 4,
    'MVP': 2,
    'Championship': 1,
  },
};

// Weighted random selection
function selectTrait(traitCategory) {
  const entries = Object.entries(TRAITS[traitCategory]);
  const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0);
  let random = Math.random() * totalWeight;
  for (const [value, weight] of entries) {
    random -= weight;
    if (random <= 0) return value;
  }
  return entries[0][0];
}

// Compute rarity tier from traits
function computeRarity(traits) {
  // Score based on individual trait rarity
  let score = 0;
  for (const [category, value] of Object.entries(traits)) {
    const weight = TRAITS[category]?.[value] || 50;
    score += (100 - weight); // Rarer = higher score
  }
  const avg = score / Object.keys(traits).length;
  if (avg >= 90) return 'mythic';
  if (avg >= 75) return 'legendary';
  if (avg >= 55) return 'rare';
  if (avg >= 35) return 'uncommon';
  return 'common';
}
```

### Metadata Generator
```javascript
// generate-metadata.js

const fs = require('fs');
const path = require('path');

const COLLECTION_SIZE = 5000;
const COLLECTION_NAME = 'Gridiron Legends';
const BASE_URI = 'ipfs://YOUR_CID_HERE';
const EXTERNAL_URL = 'https://achievemor.io/cards';

function generateMetadata(tokenId, traits, rarity) {
  return {
    name: `${COLLECTION_NAME} #${String(tokenId).padStart(4, '0')}`,
    description: `${COLLECTION_NAME} Series 1 — A premium digital trading card from the ACHIEVEMOR Sports Collection.`,
    image: `${BASE_URI}/${tokenId}.png`,
    external_url: `${EXTERNAL_URL}/${tokenId}`,
    attributes: [
      { trait_type: 'Background', value: traits.background },
      { trait_type: 'Border', value: traits.border },
      { trait_type: 'Team', value: traits.team },
      { trait_type: 'Position', value: traits.position },
      { trait_type: 'Special Edition', value: traits.specialEdition },
      { trait_type: 'Rarity', value: rarity },
      { display_type: 'number', trait_type: 'Overall Rating', value: Math.floor(Math.random() * 30) + 70 },
    ],
  };
}

// Generate full collection
function generateCollection() {
  const outputDir = './metadata';
  fs.mkdirSync(outputDir, { recursive: true });
  
  for (let i = 1; i <= COLLECTION_SIZE; i++) {
    const traits = {
      background: selectTrait('background'),
      border: selectTrait('border'),
      team: selectTrait('team'),
      position: selectTrait('position'),
      specialEdition: selectTrait('specialEdition'),
    };
    const rarity = computeRarity(traits);
    const metadata = generateMetadata(i, traits, rarity);
    
    fs.writeFileSync(
      path.join(outputDir, `${i}.json`),
      JSON.stringify(metadata, null, 2)
    );
  }
  console.log(`Generated ${COLLECTION_SIZE} metadata files`);
}
```

## IPFS Upload Pipeline

### Using Pinata
```javascript
// upload-to-ipfs.js
const pinataSDK = require('@pinata/sdk');
const pinata = new pinataSDK('API_KEY', 'SECRET_KEY');

// Upload entire folder
async function uploadFolder(folderPath) {
  const result = await pinata.pinFromFS(folderPath, {
    pinataMetadata: { name: 'GridironLegends-S1' },
  });
  console.log(`Folder CID: ${result.IpfsHash}`);
  return result.IpfsHash;
}

// Upload single file
async function uploadFile(filePath) {
  const readableStream = fs.createReadStream(filePath);
  const result = await pinata.pinFileToIPFS(readableStream);
  return result.IpfsHash;
}
```

### Using nft.storage
```javascript
import { NFTStorage, File } from 'nft.storage';

const client = new NFTStorage({ token: 'NFT_STORAGE_KEY' });

async function uploadNFT(imagePath, metadata) {
  const imageData = fs.readFileSync(imagePath);
  const result = await client.store({
    image: new File([imageData], 'card.png', { type: 'image/png' }),
    ...metadata,
  });
  return result.url; // ipfs://... URI
}
```

## Smart Contract Patterns

### ERC-721 Mint Function (Solidity reference)
```solidity
// SPDX-License-Identifier: MIT
// Reference only — Iller_Ang focuses on frontend, not contract deployment

function mint(uint256 quantity) external payable {
    require(totalSupply() + quantity <= MAX_SUPPLY, "Exceeds supply");
    require(msg.value >= PRICE * quantity, "Insufficient payment");
    require(quantity <= MAX_PER_TX, "Exceeds max per tx");
    
    for (uint256 i = 0; i < quantity; i++) {
        _safeMint(msg.sender, _nextTokenId++);
    }
}
```

### Reading Contract State (Frontend)
```javascript
// Common read operations for mint page UI
const reads = [
  { functionName: 'totalSupply' },      // Current minted count
  { functionName: 'maxSupply' },         // Max collection size
  { functionName: 'price' },             // Mint price in wei
  { functionName: 'isActive' },          // Is minting live?
  { functionName: 'balanceOf', args: [userAddress] }, // User's holdings
];
```

## Token-Gated Content Pattern

```jsx
// TokenGate.jsx — Conditional rendering based on NFT ownership

import { useAccount, useReadContract } from 'wagmi';

const TokenGate = ({ contractAddress, abi, children, fallback }) => {
  const { address } = useAccount();
  
  const { data: balance } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'balanceOf',
    args: [address],
    enabled: !!address,
  });
  
  const hasAccess = balance && Number(balance) > 0;
  
  if (!address) return <ConnectPrompt />;
  if (!hasAccess) return fallback || <NoAccessMessage />;
  return children;
};

// Usage:
// <TokenGate contractAddress="0x..." abi={ABI}>
//   <ExclusiveContent />
// </TokenGate>
```
