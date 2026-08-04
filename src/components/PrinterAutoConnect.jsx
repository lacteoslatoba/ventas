import { useBTPrinter } from '../lib/useBTPrinter';

// Componente persistente para manejar reconexión de impresora usando el hook global.
// Se monta una sola vez en App.jsx.
const PrinterAutoConnect = () => {
    useBTPrinter(); // Activa la lógica de auto-reconexión del hook
    return null;
};

export default PrinterAutoConnect;
