# Example Project: E-Commerce Platform

This example demonstrates a real-world MFE Forge project structure.

## Project Setup

```bash
mfe-forge init ecommerce-platform
cd ecommerce-platform
```

## Scopes

### `shopper` — Customer-facing applications

```bash
mfe-forge generate host shopper/host
mfe-forge generate app shopper/catalog
mfe-forge generate app shopper/cart
mfe-forge generate app shopper/checkout
mfe-forge generate app shopper/account
```

### `admin` — Internal admin tools

```bash
mfe-forge generate host admin/host
mfe-forge generate app admin/dashboard
mfe-forge generate app admin/orders
mfe-forge generate app admin/inventory
mfe-forge generate app admin/users
```

### `shared` — Cross-cutting concerns

```bash
mfe-forge generate host shared/host
mfe-forge generate app shared/notifications
mfe-forge generate app shared/search
```

## Shared Packages

```bash
mfe-forge generate package ui
mfe-forge generate package utils
mfe-forge generate package api-client
mfe-forge generate package auth
```

## Final Structure

```
ecommerce-platform/
├── apps/
│   ├── shopper/
│   │   ├── host/           # Port 3000
│   │   ├── catalog/        # Port 3001
│   │   ├── cart/           # Port 3002
│   │   ├── checkout/       # Port 3003
│   │   └── account/        # Port 3004
│   ├── admin/
│   │   ├── host/           # Port 3010
│   │   ├── dashboard/      # Port 3011
│   │   ├── orders/         # Port 3012
│   │   ├── inventory/      # Port 3013
│   │   └── users/          # Port 3014
│   └── shared/
│       ├── host/           # Port 3020
│       ├── notifications/  # Port 3021
│       └── search/         # Port 3022
├── packages/
│   ├── ui/                 # Shared components
│   ├── utils/              # Utilities
│   ├── api-client/         # API client
│   └── auth/               # Auth logic
├── mfeforge.config.ts
└── package.json
```

## Cross-MFE Communication Example

```tsx
// shopper/catalog/src/components/ProductCard.tsx
import { globalEventBus } from '@mfe-forge/core'

function ProductCard({ product }) {
  const addToCart = () => {
    globalEventBus.emit('cart:addItem', {
      productId: product.id,
      quantity: 1,
    })
  }

  return (
    <Card>
      <img src={product.image} />
      <h3>{product.name}</h3>
      <p>${product.price}</p>
      <Button onClick={addToCart}>Add to Cart</Button>
    </Card>
  )
}
```

```tsx
// shopper/cart/src/App.tsx
import { globalEventBus } from '@mfe-forge/core'
import { useState, useEffect } from 'react'

function CartApp() {
  const [items, setItems] = useState([])

  useEffect(() => {
    return globalEventBus.on('cart:addItem', ({ productId, quantity }) => {
      setItems((prev) => [...prev, { productId, quantity }])
    })
  }, [])

  return (
    <div>
      <h2>Cart ({items.length} items)</h2>
      {/* ... */}
    </div>
  )
}
```

## Host Configuration

```tsx
// shopper/host/src/App.tsx
import React, { Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

const CatalogApp = React.lazy(() => import('catalogApp/App'))
const CartApp = React.lazy(() => import('cartApp/App'))
const CheckoutApp = React.lazy(() => import('checkoutApp/App'))
const AccountApp = React.lazy(() => import('accountApp/App'))

export default function ShopperHost() {
  return (
    <div className="shopper-app">
      <Header />
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<CatalogApp />} />
          <Route path="/cart/*" element={<CartApp />} />
          <Route path="/checkout/*" element={<CheckoutApp />} />
          <Route path="/account/*" element={<AccountApp />} />
        </Routes>
      </Suspense>
      <Footer />
    </div>
  )
}
```

## Running in Development

```bash
# All MFEs
bun dev

# Just shopper scope
bun mfe-forge dev --scope shopper

# Just admin scope
bun mfe-forge dev --scope admin

# Single app
bun mfe-forge dev --app shopper/catalog
```

## Production Deployment

```bash
# Build all
mfe-forge build

# Build specific scope
mfe-forge build --scope shopper

# Docker
docker-compose build
docker-compose up
```
