import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

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
    const storagedCart = localStorage.getItem("@RocketShoes:cart");
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];

      const productToUpdate = updatedCart.find(
        (product) => product.id === productId
      );

      const stockAmount = await api
        .get(`stock/${productId}`)
        .then((response) => response.data.amount);

      const currentAmount = productToUpdate ? productToUpdate.amount : 0;

      if (currentAmount + 1 > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }
      if (productToUpdate) {
        productToUpdate.amount = currentAmount + 1;
      } else {
        const productToAdd = await api
          .get(`products/${productId}`)
          .then((response) => response.data);

        if (productToAdd) {
          const newProduct = {
            ...productToAdd,
            amount: 1,
          };
          updatedCart.push(newProduct);
        } else {
          toast.error("Erro na adição do produto");
          return;
        }
      }

      setCart(updatedCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productToRemove = cart.find((product) => product.id === productId);
      if (productToRemove) {
        const updatedCart = cart.filter((product) => product.id !== productId);
        setCart(updatedCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
      } else {
        throw Error();
      }
    } catch {
      toast.error("Erro na remoção do produto");
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

      const stockAmount = await api
        .get(`stock/${productId}`)
        .then((response) => response.data.amount);

      if (amount > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }
      const updatedCart = [...cart];
      const productToUpdate = updatedCart.find(
        (product) => product.id === productId
      );
      if (productToUpdate) {
        productToUpdate.amount = amount;
        setCart(updatedCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
      } else {
        throw Error();
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
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
