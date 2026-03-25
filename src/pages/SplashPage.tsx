import { motion } from 'framer-motion'

interface SplashPageProps {
  status?: string
  error?: string | null
}

function ShimmerBar({ width, delay }: { width: string; delay: number }) {
  return (
    <motion.div
      className="h-3 rounded-full bg-blanco/10 overflow-hidden"
      style={{ width }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
    >
      <motion.div
        className="h-full w-1/2 bg-gradient-to-r from-transparent via-blanco/10 to-transparent"
        animate={{ x: ['-100%', '300%'] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay }}
      />
    </motion.div>
  )
}

export default function SplashPage({ status = 'Cargando...', error }: SplashPageProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-azul">
      <motion.div
        className="flex flex-col items-center gap-6"
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        {/* Logo icon */}
        <motion.div
          className="w-24 h-24 bg-amarillo rounded-2xl flex items-center justify-center shadow-lg"
          initial={{ rotate: -15 }}
          animate={{ rotate: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
        >
          <span className="text-azul text-5xl font-bold">M</span>
        </motion.div>

        {/* App name */}
        <motion.h1
          className="text-4xl font-bold text-blanco tracking-tight"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          My<span className="text-amarillo">DELEGA</span>
        </motion.h1>

        {/* Tagline */}
        <motion.p
          className="text-blanco/70 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          Gestion operativa de supermercado
        </motion.p>

        {/* Shimmer skeleton preview */}
        <motion.div
          className="w-64 space-y-3 mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
        >
          <ShimmerBar width="100%" delay={1.1} />
          <ShimmerBar width="75%" delay={1.2} />
          <ShimmerBar width="90%" delay={1.3} />
        </motion.div>

        {/* Status / Error */}
        <motion.div
          className="flex flex-col items-center gap-3 mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
        >
          {error ? (
            <p className="text-rojo text-sm font-medium px-4 text-center">{error}</p>
          ) : (
            <>
              <div className="flex gap-2">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2.5 h-2.5 rounded-full bg-amarillo"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </div>
              <p className="text-blanco/50 text-xs">{status}</p>
            </>
          )}
        </motion.div>
      </motion.div>
    </div>
  )
}
