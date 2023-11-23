import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";

function App() {
  const saveTransactionsToLocalStorage = (transactions) => {
    localStorage.setItem("transactions", JSON.stringify(transactions));
  };

  const loadTransactionsFromLocalStorage = () => {
    const storedTransactions = localStorage.getItem("transactions");
    return storedTransactions ? JSON.parse(storedTransactions) : [];
  };

  const [transactions, setTransactions] = useState(() =>
    loadTransactionsFromLocalStorage()
  );
  const [formData, setFormData] = useState({
    date: "",
    coinValue: "",
    amountPaid: "",
    coinBought: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState("date");
  const [editIndex, setEditIndex] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  const [coinOptions, setCoinOptions] = useState([]);

  // ...

  useEffect(() => {
    const fetchCoinOptions = async () => {
      try {
        const response = await axios.get(
          "https://api.coingecko.com/api/v3/coins/list"
        );

        const coins = response.data.map((coin) => ({
          id: coin.id,
          name: coin.name,
        }));

        setCoinOptions(coins);
      } catch (error) {
        console.error("Error al obtener las monedas:", error);
      }
    };

    fetchCoinOptions();
  }, []);

  // Obtener monedas únicas de las transacciones
  useEffect(() => {
    const getCoinPrices = async () => {
      const coinsSet = new Set(
        transactions.map((transaction) => transaction.coinBought)
      );
      const uniqueCoins = Array.from(coinsSet);

      try {
        const coinPrices = await Promise.all(
          uniqueCoins.map(async (coin) => {
            const response = await axios.get(
              `https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd`
            );
            return {
              coin: coin,
              price: response.data[coin]?.usd || null,
            };
          })
        );

        console.log(coinPrices); // Esto mostrará un array con los precios actuales de las monedas únicas en USD

        // Aquí podrías actualizar el estado o realizar cualquier otra acción con los precios obtenidos
      } catch (error) {
        console.error("Error al obtener los precios:", error);
      }
    };

    getCoinPrices();
  }, [transactions]);
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Validaciones simples aquí
    if (!value.trim() && name !== "coinValue") {
      setFormErrors({ ...formErrors, [name]: `¡${name} es obligatorio!` });
    } else {
      setFormErrors({ ...formErrors, [name]: null });
    }
    // Validación específica para el campo de valor de la moneda
    if (name === "coinValue" && isNaN(value)) {
      setFormErrors({ ...formErrors, [name]: `¡${name} debe ser un número!` });
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validaciones finales antes de agregar/editar
    const values = Object.values(formData);
    const errors = Object.values(formErrors).filter((error) => error !== null);

    // Verificar que existan errores en los campos requeridos (excepto coinValue)
    const requiredFields = ["date", "amountPaid", "coinBought"];
    const requiredErrors = requiredFields.some(
      (field) => !formData[field] || formErrors[field]
    );

    if (requiredErrors || errors.length > 0) {
      alert("Por favor, completa correctamente todos los campos.");
      return;
    }

    if (editIndex !== null) {
      // Lógica para actualizar la transacción
      handleUpdate();
    } else {
      // Obtener el precio de la moneda comprada en este momento
      try {
        const response = await axios.get(
          `https://api.coingecko.com/api/v3/simple/price?ids=${formData.coinBought}&vs_currencies=usd`
        );

        const coinValue = response.data[formData.coinBought]?.usd || null;

        // Agregar nueva transacción con el valor de la moneda obtenido
        const newTransaction = { ...formData, coinValue };
        const updatedTransactions = [...transactions, newTransaction];
        setTransactions(updatedTransactions);
        saveTransactionsToLocalStorage(updatedTransactions);
        setFormData({
          date: "",
          amountPaid: "",
          coinBought: "",
        });
      } catch (error) {
        console.error("Error al obtener el precio de la moneda:", error);
        alert(
          "Error al obtener el precio de la moneda. Por favor, intenta nuevamente."
        );
      }
    }

    setEditIndex(null);
  };

  const handleEdit = (index) => {
    setEditIndex(index);
    const transactionToEdit = transactions[index];
    setFormData({ ...transactionToEdit });
  };

  const handleUpdate = () => {
    const updatedTransactions = [...transactions];
    updatedTransactions[editIndex] = { ...formData };
    setTransactions(updatedTransactions);
    saveTransactionsToLocalStorage(updatedTransactions);
    setFormData({
      date: "",
      coinValue: "",
      amountPaid: "",
      coinBought: "",
    });
    setEditIndex(null);
  };

  const handleDelete = (index) => {
    const updatedTransactions = transactions.filter((_, i) => i !== index);
    setTransactions(updatedTransactions);
    saveTransactionsToLocalStorage(updatedTransactions);
  };

  const filteredTransactions = transactions.filter((transaction) => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return (
      transaction.date.toLowerCase().includes(lowerCaseSearchTerm) ||
      transaction.coinBought.toLowerCase().includes(lowerCaseSearchTerm) ||
      transaction.amountPaid.toLowerCase().includes(lowerCaseSearchTerm)
    );
  });
  const [coinSearchTerm, setCoinSearchTerm] = useState("");
  return (
    <div className="App">
      <h1>Gestión de Criptomonedas</h1>
      <input
        type="text"
        placeholder="Buscar por fecha, nombre o importe"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <form onSubmit={handleSubmit}>
        <label>
          Fecha:
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleInputChange}
          />
          {formErrors.date && <span className="error">{formErrors.date}</span>}
        </label>

        <label>
          Importe pagado:
          <input
            type="text"
            name="amountPaid"
            placeholder="Ingrese el Importe Pagado"
            value={formData.amountPaid}
            onChange={handleInputChange}
          />
          {formErrors.amountPaid && (
            <span className="error">{formErrors.amountPaid}</span>
          )}
        </label>
        <label>
          Moneda comprada:
          <input
            type="text"
            placeholder="Buscar moneda..."
            value={coinSearchTerm}
            onChange={(e) => setCoinSearchTerm(e.target.value)}
          />
          <select
            name="coinBought"
            value={formData.coinBought}
            onChange={handleInputChange}
          >
            <option value="">Selecciona una moneda</option>
            {coinOptions
              .filter((coin) =>
                coin.name.toLowerCase().includes(coinSearchTerm.toLowerCase())
              )
              .map((coin) => (
                <option key={coin.id} value={coin.id}>
                  {coin.name}
                </option>
              ))}
          </select>
          {formErrors.coinBought && (
            <span className="error">{formErrors.coinBought}</span>
          )}
        </label>
        <button type="submit">
          {editIndex !== null
            ? "Actualizar Transacción"
            : "Agregar Transacción"}
        </button>
      </form>
      <div>
        <h2>Transacciones</h2>
        <ul>
          {filteredTransactions.map((transaction, index) => (
            <li key={index}>
              Fecha: {transaction.date}, Valor: {transaction.coinValue}, Pagado:{" "}
              {transaction.amountPaid}, Comprada: {transaction.coinBought}
              <button onClick={() => handleEdit(index)}>Editar</button>
              <button onClick={() => handleDelete(index)}>Eliminar</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
