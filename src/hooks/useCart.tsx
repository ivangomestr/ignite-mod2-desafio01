import { createContext, ReactNode, useContext, useState } from 'react';
import { MdAppSettingsAlt } from 'react-icons/md';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      // Usando spread operator para manter a imutabilidade, transformando o updatedCart em um novo array.
      const updatedCart = [...cart];

      //Verificando se product.id for igual a productId, signifca que o produto existe no carrinho. Se não, ele não existe.
      const productExists = updatedCart.find(product => product.id === productId)

      // Pega o estoque através da rota do JSON Server
      const stock = await api.get(`/stock/${productId}`)

      //Pega o amount dos dados do estoque, verifica se o produto existir, pega a quantidade dele no carrinho. Se não existir no carrinho, a quantidade é 0.
      const stockAmount = stock.data.amount
      const currentAmount = productExists ? productExists.amount : 0;

      // A quantidade desejada, incrementando + 1
      const amount = currentAmount + 1

      // Verifica se a quantidade de produtos solicitada é maior que a do estoque. Caso true, retorna uma mensagem de erro.
      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque')
        return;
      }

      // Caso o produto exista, será incrementado + 1. Se não, uma requisição será feita pegando todos os produtos, criando um novo produto e adicionando-o ao carrinho com um push.
      if (productExists) {
        productExists.amount = amount;
      } else {
        const product = await api.get(`/products/${productId}`)

        const newProduct = {
          ...product.data,
          amount: 1
        }
        updatedCart.push(newProduct)
      }

      setCart(updatedCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      // Usando imutabilidade, porque toda vez que um produto é removido, altera o valor de cart.
      const updatedCart = [...cart]
      const productIndex = updatedCart.findIndex(product => product.id === productId)

      // Se encontrar o item no carrinho, remove o 1 item através do productIndex e seta no estado.
      if (productIndex >= 0) {
        updatedCart.splice(productIndex, 1)
        setCart(updatedCart)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const stock = await api.get(`/stock/${productId}`)

      const stockAmount = stock.data.amount

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque')
        return;
      }

      const updatedCart = [...cart]
      const productExists = updatedCart.find(product => product.id === productId)

      if (productExists) {
        productExists.amount = amount
        setCart(updatedCart)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
      } else {
        throw Error('Erro na alteração de quantidade do produto')
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto')
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
