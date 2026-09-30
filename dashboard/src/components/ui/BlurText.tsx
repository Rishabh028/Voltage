"use client";

import { motion } from "framer-motion";

interface BlurTextProps {
  text: string;
  className?: string;
  wordClassName?: string;
  delay?: number;
}

export default function BlurText({
  text,
  className = "",
  wordClassName = "",
  delay = 0,
}: BlurTextProps) {
  const words = text.split(" ");

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: delay,
      },
    },
  };

  const wordVariants = {
    hidden: {
      filter: "blur(10px)",
      opacity: 0,
      y: 50,
    },
    visible: {
      filter: "blur(0px)",
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.7,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      className={`flex flex-wrap justify-center ${className}`}
      style={{ rowGap: "0.1em" }}
    >
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          variants={wordVariants}
          className={`inline-block ${wordClassName}`}
          style={{ marginRight: "0.28em" }}
        >
          {word}
        </motion.span>
      ))}
    </motion.div>
  );
}
