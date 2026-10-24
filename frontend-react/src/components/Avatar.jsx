/* Foto de perfil redonda; sem foto, mostra as iniciais do nome */
export default function Avatar({ fotoUrl, nome, tamanho = 32, className = "" }) {
    const iniciais = (nome || "?")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map(parte => parte[0].toUpperCase())
        .join("");

    const estilo = { width: tamanho, height: tamanho, fontSize: Math.round(tamanho * 0.38) };

    if (fotoUrl) {
        return (
            <img
                src={fotoUrl}
                alt={"Foto de " + (nome || "usuário")}
                style={estilo}
                className={"rounded-full object-cover shrink-0 " + className}
            />
        );
    }
    return (
        <span
            style={estilo}
            className={"rounded-full shrink-0 bg-realce-forte text-marca-texto font-semibold flex items-center justify-center " + className}
        >
            {iniciais}
        </span>
    );
}
