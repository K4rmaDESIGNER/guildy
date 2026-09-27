import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type CalculatorMode =
  | 'human'
  | 'magic'

type MagicResource =
  | 'gold'
  | 'platinum'

type Operation =
  | '+'
  | '-'
  | '×'
  | '÷'
  | null

type CurrencyCode =
  | 'BRL'
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'JPY'
  | 'CAD'
  | 'CHF'
  | 'CNY'

const currencies: {
  code: CurrencyCode
  name: string
  symbol: string
}[] = [
  {
    code: 'BRL',
    name: 'Real Brasileiro',
    symbol: 'R$',
  },
  {
    code: 'USD',
    name: 'Dólar Americano',
    symbol: '$',
  },
  {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
  },
  {
    code: 'GBP',
    name: 'Libra Esterlina',
    symbol: '£',
  },
  {
    code: 'JPY',
    name: 'Iene Japonês',
    symbol: '¥',
  },
  {
    code: 'CAD',
    name: 'Dólar Canadense',
    symbol: 'C$',
  },
  {
    code: 'CHF',
    name: 'Franco Suíço',
    symbol: 'CHF',
  },
  {
    code: 'CNY',
    name: 'Yuan Chinês',
    symbol: '¥',
  },
]

function Calculator() {
  const navigate = useNavigate()

  /* =====================================================
     MODO
  ===================================================== */

  const [mode, setMode] =
    useState<CalculatorMode>('human')

  /* =====================================================
     CALCULADORA HUMANA
  ===================================================== */

  const [display, setDisplay] =
    useState('0')

  const [previousValue, setPreviousValue] =
    useState<number | null>(null)

  const [operation, setOperation] =
    useState<Operation>(null)

  const [waitingForValue, setWaitingForValue] =
    useState(false)

  /* =====================================================
     CONVERSOR HUMANO
  ===================================================== */

  const [currencyAmount, setCurrencyAmount] =
    useState('1')

  const [fromCurrency, setFromCurrency] =
    useState<CurrencyCode>('BRL')

  const [toCurrency, setToCurrency] =
    useState<CurrencyCode>('USD')

  const [currencyResult, setCurrencyResult] =
    useState<number | null>(null)

  const [currencyRate, setCurrencyRate] =
    useState<number | null>(null)

  const [convertingCurrency, setConvertingCurrency] =
    useState(false)

  /* =====================================================
     SALDOS MÁGICOS
  ===================================================== */

  const [goldBalance, setGoldBalance] =
    useState(0)

  const [platinumBalance, setPlatinumBalance] =
    useState(0)

  const [loadingGold, setLoadingGold] =
    useState(true)

  const [loadingPlatinum, setLoadingPlatinum] =
    useState(true)

  /* =====================================================
     RECURSO SELECIONADO
  ===================================================== */

  const [magicResource, setMagicResource] =
    useState<MagicResource>('gold')

  const [magicAmount, setMagicAmount] =
    useState('')

  const [magicCurrency, setMagicCurrency] =
    useState<CurrencyCode>('BRL')

  const [magicResult, setMagicResult] =
    useState<number | null>(null)

  const [magicExchangeRate, setMagicExchangeRate] =
    useState<number | null>(null)

  const [convertingMagic, setConvertingMagic] =
    useState(false)

  /* =====================================================
     VALOR DO GOLD
  ===================================================== */

  const [goldBrlRate, setGoldBrlRate] =
    useState(() => {
      const saved =
        localStorage.getItem(
          'guildy_gold_brl_rate'
        )

      return saved || '1'
    })

  /* =====================================================
     VALOR DO PLATINUM
  ===================================================== */

  const [platinumBrlRate, setPlatinumBrlRate] =
    useState(() => {
      const saved =
        localStorage.getItem(
          'guildy_platinum_brl_rate'
        )

      return saved || '1'
    })

  /* =====================================================
     MENSAGENS
  ===================================================== */

  const [message, setMessage] =
    useState('')

  /* =====================================================
     INÍCIO
  ===================================================== */

  useEffect(() => {
    loadGoldBalance()
    loadPlatinumBalance()
  }, [])

  /* =====================================================
     GOLD GLOBAL
  ===================================================== */

  async function loadGoldBalance() {
    setLoadingGold(true)

    const { data, error } =
      await supabase
        .from('gold_transactions')
        .select('amount')

    if (error) {
      console.error(
        'Erro ao carregar Gold:',
        error
      )

      setMessage(
        'Não foi possível carregar o Gold da Guilda.'
      )

      setLoadingGold(false)
      return
    }

    const total =
      (data ?? []).reduce(
        (
          sum,
          transaction
        ) =>
          sum +
          Number(
            transaction.amount
          ),
        0
      )

    setGoldBalance(total)
    setLoadingGold(false)
  }

  /* =====================================================
     PLATINUM DO USUÁRIO
  ===================================================== */

  async function loadPlatinumBalance() {
    setLoadingPlatinum(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setLoadingPlatinum(false)
      return
    }

    const { data, error } =
      await supabase
        .from('platinum_transactions')
        .select('amount')
        .eq(
          'user_id',
          user.id
        )

    if (error) {
      console.error(
        'Erro ao carregar Platinum:',
        error
      )

      setMessage(
        'Não foi possível carregar seu Platinum.'
      )

      setLoadingPlatinum(false)
      return
    }

    const total =
      (data ?? []).reduce(
        (
          sum,
          transaction
        ) =>
          sum +
          Number(
            transaction.amount
          ),
        0
      )

    setPlatinumBalance(total)
    setLoadingPlatinum(false)
  }

  /* =====================================================
     CALCULADORA BÁSICA
  ===================================================== */

  function inputDigit(
    digit: string
  ) {
    if (
      display === 'Erro' ||
      waitingForValue
    ) {
      setDisplay(digit)
      setWaitingForValue(false)
      return
    }

    if (
      display === '0'
    ) {
      setDisplay(digit)
    } else {
      setDisplay(
        display + digit
      )
    }
  }

  function inputDecimal() {
    if (
      display === 'Erro' ||
      waitingForValue
    ) {
      setDisplay('0.')
      setWaitingForValue(false)
      return
    }

    if (
      !display.includes('.')
    ) {
      setDisplay(
        display + '.'
      )
    }
  }

  function clearCalculator() {
    setDisplay('0')
    setPreviousValue(null)
    setOperation(null)
    setWaitingForValue(false)
  }

  function deleteDigit() {
    if (
      waitingForValue ||
      display === 'Erro'
    ) {
      return
    }

    if (
      display.length <= 1 ||
      (
        display.startsWith('-') &&
        display.length === 2
      )
    ) {
      setDisplay('0')
      return
    }

    setDisplay(
      display.slice(
        0,
        -1
      )
    )
  }

  function toggleSign() {
    if (
      display === 'Erro'
    ) {
      return
    }

    const value =
      Number(display)

    setDisplay(
      String(
        value * -1
      )
    )
  }

  function percentage() {
    if (
      display === 'Erro'
    ) {
      return
    }

    const value =
      Number(display)

    setDisplay(
      formatCalculatorNumber(
        value / 100
      )
    )
  }

  function calculate(
    first: number,
    second: number,
    selectedOperation: Operation
  ) {
    switch (
      selectedOperation
    ) {
      case '+':
        return first + second

      case '-':
        return first - second

      case '×':
        return first * second

      case '÷':
        if (
          second === 0
        ) {
          return NaN
        }

        return first / second

      default:
        return second
    }
  }

  function chooseOperation(
    nextOperation: Operation
  ) {
    if (
      display === 'Erro'
    ) {
      clearCalculator()
      return
    }

    const currentValue =
      Number(display)

    if (
      previousValue === null
    ) {
      setPreviousValue(
        currentValue
      )
    } else if (
      operation &&
      !waitingForValue
    ) {
      const result =
        calculate(
          previousValue,
          currentValue,
          operation
        )

      if (
        Number.isNaN(result)
      ) {
        setDisplay('Erro')
        setPreviousValue(null)
        setOperation(null)
        setWaitingForValue(true)
        return
      }

      setDisplay(
        formatCalculatorNumber(
          result
        )
      )

      setPreviousValue(
        result
      )
    }

    setOperation(
      nextOperation
    )

    setWaitingForValue(
      true
    )
  }

  function equals() {
    if (
      previousValue === null ||
      operation === null ||
      display === 'Erro'
    ) {
      return
    }

    const currentValue =
      Number(display)

    const result =
      calculate(
        previousValue,
        currentValue,
        operation
      )

    if (
      Number.isNaN(result)
    ) {
      setDisplay('Erro')
    } else {
      setDisplay(
        formatCalculatorNumber(
          result
        )
      )
    }

    setPreviousValue(null)
    setOperation(null)
    setWaitingForValue(true)
  }

  function formatCalculatorNumber(
    number: number
  ) {
    if (
      !Number.isFinite(number)
    ) {
      return 'Erro'
    }

    const rounded =
      Math.round(
        (
          number +
          Number.EPSILON
        ) *
          100000000
      ) /
      100000000

    return String(rounded)
  }

  /* =====================================================
     FORMATAÇÃO
  ===================================================== */

  function formatCurrency(
    value: number,
    currency: CurrencyCode
  ) {
    return new Intl
      .NumberFormat(
        'pt-BR',
        {
          style: 'currency',
          currency,
        }
      )
      .format(value)
  }

  function formatResource(
    value: number
  ) {
    return value
      .toLocaleString(
        'pt-BR',
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }
      )
  }

  /* =====================================================
     COTAÇÃO
  ===================================================== */

  async function getRate(
    from: CurrencyCode,
    to: CurrencyCode
  ) {
    if (
      from === to
    ) {
      return 1
    }

    const response =
      await fetch(
        `https://api.frankfurter.dev/v2/rate/${from.toLowerCase()}/${to.toLowerCase()}`
      )

    if (
      !response.ok
    ) {
      throw new Error(
        'Cotação indisponível'
      )
    }

    const data =
      await response.json()

    if (
      typeof data.rate !==
      'number'
    ) {
      throw new Error(
        'Cotação inválida'
      )
    }

    return data.rate as number
  }

  /* =====================================================
     CONVERSÃO HUMANA
  ===================================================== */

  async function convertCurrency() {
    setMessage('')
    setCurrencyResult(null)

    const amount =
      Number(
        currencyAmount.replace(
          ',',
          '.'
        )
      )

    if (
      !Number.isFinite(amount) ||
      amount < 0
    ) {
      setMessage(
        'Digite um valor válido para converter.'
      )
      return
    }

    setConvertingCurrency(
      true
    )

    try {
      const rate =
        await getRate(
          fromCurrency,
          toCurrency
        )

      setCurrencyRate(
        rate
      )

      setCurrencyResult(
        amount * rate
      )
    } catch (
      error
    ) {
      console.error(
        'Erro na conversão:',
        error
      )

      setMessage(
        'Não foi possível consultar a cotação agora.'
      )
    } finally {
      setConvertingCurrency(
        false
      )
    }
  }

  function swapCurrencies() {
    const oldFrom =
      fromCurrency

    setFromCurrency(
      toCurrency
    )

    setToCurrency(
      oldFrom
    )

    setCurrencyResult(
      null
    )

    setCurrencyRate(
      null
    )
  }

  /* =====================================================
     ALTERAR RECURSO MÁGICO
  ===================================================== */

  function selectMagicResource(
    resource: MagicResource
  ) {
    setMagicResource(
      resource
    )

    setMagicAmount('')
    setMagicResult(null)
    setMagicExchangeRate(null)
    setMessage('')
  }

  /* =====================================================
     TAXA DO GOLD
  ===================================================== */

  function updateGoldRate(
    value: string
  ) {
    setGoldBrlRate(value)

    localStorage.setItem(
      'guildy_gold_brl_rate',
      value
    )

    setMagicResult(null)
  }

  /* =====================================================
     TAXA DO PLATINUM
  ===================================================== */

  function updatePlatinumRate(
    value: string
  ) {
    setPlatinumBrlRate(
      value
    )

    localStorage.setItem(
      'guildy_platinum_brl_rate',
      value
    )

    setMagicResult(null)
  }

  /* =====================================================
     SALDO ATUAL SELECIONADO
  ===================================================== */

  function currentMagicBalance() {
    return magicResource ===
      'gold'
      ? goldBalance
      : platinumBalance
  }

  function currentMagicRate() {
    return magicResource ===
      'gold'
      ? goldBrlRate
      : platinumBrlRate
  }

  function currentMagicName() {
    return magicResource ===
      'gold'
      ? 'GOLD'
      : 'PLATINUM'
  }

  function currentMagicSymbol() {
    return magicResource ===
      'gold'
      ? '◉'
      : '◆'
  }

  /* =====================================================
     CONVERSÃO MÁGICA
  ===================================================== */

  async function convertMagicResource() {
    setMessage('')
    setMagicResult(null)

    const amount =
      Number(
        magicAmount.replace(
          ',',
          '.'
        )
      )

    const resourceRate =
      Number(
        currentMagicRate().replace(
          ',',
          '.'
        )
      )

    if (
      !Number.isFinite(amount) ||
      amount < 0
    ) {
      setMessage(
        `Digite uma quantidade válida de ${currentMagicName()}.`
      )
      return
    }

    if (
      !Number.isFinite(
        resourceRate
      ) ||
      resourceRate <= 0
    ) {
      setMessage(
        `Defina um valor válido para ${currentMagicName()}.`
      )
      return
    }

    setConvertingMagic(
      true
    )

    try {
      /*
        GOLD / PLATINUM
              ↓
             BRL
              ↓
        MOEDA ESCOLHIDA
      */

      const amountInBRL =
        amount *
        resourceRate

      const rate =
        await getRate(
          'BRL',
          magicCurrency
        )

      setMagicExchangeRate(
        rate
      )

      setMagicResult(
        amountInBRL *
          rate
      )
    } catch (
      error
    ) {
      console.error(
        'Erro na conversão mágica:',
        error
      )

      setMessage(
        'Não foi possível consultar a cotação agora.'
      )
    } finally {
      setConvertingMagic(
        false
      )
    }
  }

  /* =====================================================
     INTERFACE
  ===================================================== */

  return (
    <main className="calculator-page">

      <div className="calculator-container">

        {/* =================================================
            CABEÇALHO
        ================================================= */}

        <header className="calculator-header">

          <div>

            <button
              className="calculator-back-button"
              onClick={() =>
                navigate('/home')
              }
            >
              ← VOLTAR
            </button>

            <span className="calculator-kicker">
              ARTEFATO NUMÉRICO
            </span>

            <h1>
              ✧ CALCULADORA
            </h1>

            <p>
              Números do mundo real
              e riquezas da Guilda.
            </p>

          </div>

        </header>

        {/* =================================================
            ESCOLHA DO MODO
        ================================================= */}

        <section className="calculator-mode-switch">

          <button
            className={
              mode === 'human'
                ? 'calculator-mode human active'
                : 'calculator-mode human'
            }
            onClick={() => {
              setMode('human')
              setMessage('')
            }}
          >

            <span>
              ⚙
            </span>

            <div>

              <strong>
                CALCULADORA HUMANA
              </strong>

              <small>
                Números e moedas reais
              </small>

            </div>

          </button>

          <button
            className={
              mode === 'magic'
                ? 'calculator-mode magic active'
                : 'calculator-mode magic'
            }
            onClick={() => {
              setMode('magic')
              setMessage('')
            }}
          >

            <span>
              ✦
            </span>

            <div>

              <strong>
                CALCULADORA MÁGICA
              </strong>

              <small>
                Gold e Platinum
              </small>

            </div>

          </button>

        </section>

        {message && (
          <div className="calculator-message">
            {message}
          </div>
        )}

        {/* =================================================
            MODO HUMANO
        ================================================= */}

        {mode === 'human' && (

          <section className="human-calculator-grid">

            {/* CALCULADORA */}

            <article className="calculator-machine">

              <div className="calculator-panel-title">

                <span>
                  CALCULADORA
                </span>

                <strong>
                  HUMANA
                </strong>

              </div>

              <div className="calculator-display">

                <small>

                  {previousValue !==
                    null &&
                  operation
                    ? `${formatCalculatorNumber(
                        previousValue
                      )} ${operation}`
                    : 'PRONTA'}

                </small>

                <strong>
                  {display}
                </strong>

              </div>

              <div className="calculator-buttons">

                <button
                  className="calc-special"
                  onClick={
                    clearCalculator
                  }
                >
                  AC
                </button>

                <button
                  className="calc-special"
                  onClick={
                    toggleSign
                  }
                >
                  +/−
                </button>

                <button
                  className="calc-special"
                  onClick={
                    percentage
                  }
                >
                  %
                </button>

                <button
                  className="calc-operation"
                  onClick={() =>
                    chooseOperation(
                      '÷'
                    )
                  }
                >
                  ÷
                </button>

                <button
                  onClick={() =>
                    inputDigit('7')
                  }
                >
                  7
                </button>

                <button
                  onClick={() =>
                    inputDigit('8')
                  }
                >
                  8
                </button>

                <button
                  onClick={() =>
                    inputDigit('9')
                  }
                >
                  9
                </button>

                <button
                  className="calc-operation"
                  onClick={() =>
                    chooseOperation(
                      '×'
                    )
                  }
                >
                  ×
                </button>

                <button
                  onClick={() =>
                    inputDigit('4')
                  }
                >
                  4
                </button>

                <button
                  onClick={() =>
                    inputDigit('5')
                  }
                >
                  5
                </button>

                <button
                  onClick={() =>
                    inputDigit('6')
                  }
                >
                  6
                </button>

                <button
                  className="calc-operation"
                  onClick={() =>
                    chooseOperation(
                      '-'
                    )
                  }
                >
                  −
                </button>

                <button
                  onClick={() =>
                    inputDigit('1')
                  }
                >
                  1
                </button>

                <button
                  onClick={() =>
                    inputDigit('2')
                  }
                >
                  2
                </button>

                <button
                  onClick={() =>
                    inputDigit('3')
                  }
                >
                  3
                </button>

                <button
                  className="calc-operation"
                  onClick={() =>
                    chooseOperation(
                      '+'
                    )
                  }
                >
                  +
                </button>

                <button
                  className="calc-delete"
                  onClick={
                    deleteDigit
                  }
                >
                  ⌫
                </button>

                <button
                  onClick={() =>
                    inputDigit('0')
                  }
                >
                  0
                </button>

                <button
                  onClick={
                    inputDecimal
                  }
                >
                  ,
                </button>

                <button
                  className="calc-equals"
                  onClick={
                    equals
                  }
                >
                  =
                </button>

              </div>

            </article>

            {/* CONVERSOR */}

            <article className="currency-converter-card">

              <div className="calculator-panel-title">

                <span>
                  CONVERSOR
                </span>

                <strong>
                  MOEDAS REAIS
                </strong>

              </div>

              <div className="currency-field">

                <label>
                  Valor
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    currencyAmount
                  }
                  onChange={(
                    event
                  ) => {
                    setCurrencyAmount(
                      event.target.value
                    )

                    setCurrencyResult(
                      null
                    )
                  }}
                />

              </div>

              <div className="currency-selector-row">

                <div>

                  <label>
                    De
                  </label>

                  <select
                    value={
                      fromCurrency
                    }
                    onChange={(
                      event
                    ) => {
                      setFromCurrency(
                        event.target
                          .value as CurrencyCode
                      )

                      setCurrencyResult(
                        null
                      )
                    }}
                  >

                    {currencies.map(
                      (currency) => (

                        <option
                          key={
                            currency.code
                          }
                          value={
                            currency.code
                          }
                        >
                          {currency.code}
                          {' — '}
                          {currency.name}
                        </option>

                      )
                    )}

                  </select>

                </div>

                <button
                  className="swap-currency-button"
                  onClick={
                    swapCurrencies
                  }
                >
                  ⇄
                </button>

                <div>

                  <label>
                    Para
                  </label>

                  <select
                    value={
                      toCurrency
                    }
                    onChange={(
                      event
                    ) => {
                      setToCurrency(
                        event.target
                          .value as CurrencyCode
                      )

                      setCurrencyResult(
                        null
                      )
                    }}
                  >

                    {currencies.map(
                      (currency) => (

                        <option
                          key={
                            currency.code
                          }
                          value={
                            currency.code
                          }
                        >
                          {currency.code}
                          {' — '}
                          {currency.name}
                        </option>

                      )
                    )}

                  </select>

                </div>

              </div>

              <button
                className="convert-currency-button"
                onClick={
                  convertCurrency
                }
                disabled={
                  convertingCurrency
                }
              >

                {convertingCurrency
                  ? 'CONSULTANDO COTAÇÃO...'
                  : 'CONVERTER'}

              </button>

              <div className="currency-result">

                <span>
                  RESULTADO
                </span>

                <strong>

                  {currencyResult ===
                  null
                    ? '—'
                    : formatCurrency(
                        currencyResult,
                        toCurrency
                      )}

                </strong>

                {currencyRate !==
                  null && (

                  <small>

                    1 {fromCurrency}
                    {' = '}
                    {currencyRate.toLocaleString(
                      'pt-BR',
                      {
                        maximumFractionDigits:
                          6,
                      }
                    )}
                    {' '}
                    {toCurrency}

                  </small>

                )}

              </div>

              <p className="currency-source">
                Cotação de referência
                consultada pela internet.
              </p>

            </article>

          </section>

        )}

        {/* =================================================
            MODO MÁGICO
        ================================================= */}

        {mode === 'magic' && (

          <section className="magic-calculator">

            {/* =============================================
                TESOURO
            ============================================= */}

            <article className="magic-treasury-card">

              <div className="magic-treasury-glow" />

              <span className="magic-card-kicker">
                TESOURO MÁGICO
              </span>

              <div className="magic-resource-cards">

                {/* GOLD */}

                <button
                  className={
                    magicResource ===
                    'gold'
                      ? 'magic-resource-card gold selected'
                      : 'magic-resource-card gold'
                  }
                  onClick={() =>
                    selectMagicResource(
                      'gold'
                    )
                  }
                >

                  <span className="magic-resource-symbol">
                    ◉
                  </span>

                  <small>
                    TESOURO DA GUILDA
                  </small>

                  <strong>

                    {loadingGold
                      ? '...'
                      : formatResource(
                          goldBalance
                        )}

                  </strong>

                  <span>
                    GOLD
                  </span>

                </button>

                {/* PLATINUM */}

                <button
                  className={
                    magicResource ===
                    'platinum'
                      ? 'magic-resource-card platinum selected'
                      : 'magic-resource-card platinum'
                  }
                  onClick={() =>
                    selectMagicResource(
                      'platinum'
                    )
                  }
                >

                  <span className="magic-resource-symbol">
                    ◆
                  </span>

                  <small>
                    SEU SALDO
                  </small>

                  <strong>

                    {loadingPlatinum
                      ? '...'
                      : formatResource(
                          platinumBalance
                        )}

                  </strong>

                  <span>
                    PLATINUM
                  </span>

                </button>

              </div>

              <button
                onClick={() =>
                  setMagicAmount(
                    String(
                      currentMagicBalance()
                    )
                  )
                }
                disabled={
                  magicResource ===
                  'gold'
                    ? loadingGold
                    : loadingPlatinum
                }
              >
                USAR SALDO TOTAL DE{' '}
                {currentMagicName()}
              </button>

            </article>

            {/* =============================================
                CONVERSOR MÁGICO
            ============================================= */}

            <article className="magic-converter-card">

              <div className="calculator-panel-title magic">

                <span>
                  ARTE DA CONVERSÃO
                </span>

                <strong>
                  {currentMagicName()}
                  {' → '}
                  MUNDO REAL
                </strong>

              </div>

              {/* TAXA */}

              <div className="magic-equation">

                <div>

                  <span>
                    {currentMagicSymbol()}
                  </span>

                  <strong>
                    1{' '}
                    {currentMagicName()}
                  </strong>

                </div>

                <b>
                  =
                </b>

                <div>

                  <span>
                    R$
                  </span>

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={
                      currentMagicRate()
                    }
                    onChange={(
                      event
                    ) => {
                      if (
                        magicResource ===
                        'gold'
                      ) {
                        updateGoldRate(
                          event.target.value
                        )
                      } else {
                        updatePlatinumRate(
                          event.target.value
                        )
                      }
                    }}
                  />

                </div>

              </div>

              <p className="magic-rate-description">

                Defina quanto vale
                1{' '}
                {currentMagicName()}
                {' '}
                em Reais.

              </p>

              {/* CAMPOS */}

              <div className="magic-fields">

                <div>

                  <label>
                    Quantidade de{' '}
                    {currentMagicName()}
                  </label>

                  <div className="gold-input-wrapper">

                    <span>
                      {currentMagicSymbol()}
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={
                        magicAmount
                      }
                      onChange={(
                        event
                      ) => {
                        setMagicAmount(
                          event.target.value
                        )

                        setMagicResult(
                          null
                        )
                      }}
                    />

                  </div>

                </div>

                <div>

                  <label>
                    Converter para
                  </label>

                  <select
                    value={
                      magicCurrency
                    }
                    onChange={(
                      event
                    ) => {
                      setMagicCurrency(
                        event.target
                          .value as CurrencyCode
                      )

                      setMagicResult(
                        null
                      )
                    }}
                  >

                    {currencies.map(
                      (currency) => (

                        <option
                          key={
                            currency.code
                          }
                          value={
                            currency.code
                          }
                        >
                          {currency.code}
                          {' — '}
                          {currency.name}
                        </option>

                      )
                    )}

                  </select>

                </div>

              </div>

              {/* BOTÃO */}

              <button
                className="magic-convert-button"
                onClick={
                  convertMagicResource
                }
                disabled={
                  convertingMagic
                }
              >

                {convertingMagic
                  ? 'INVOCANDO COTAÇÃO...'
                  : `✦ CONVERTER ${currentMagicName()}`}

              </button>

              {/* RESULTADO */}

              <div className="magic-result">

                <span>
                  VALOR NO MUNDO REAL
                </span>

                <strong>

                  {magicResult ===
                  null
                    ? '—'
                    : formatCurrency(
                        magicResult,
                        magicCurrency
                      )}

                </strong>

                {magicResult !==
                  null && (

                  <small>

                    {formatResource(
                      Number(
                        magicAmount
                      ) || 0
                    )}

                    {' '}

                    {currentMagicName()}

                    {' × R$ '}

                    {Number(
                      currentMagicRate()
                    ).toLocaleString(
                      'pt-BR',
                      {
                        minimumFractionDigits:
                          2,

                        maximumFractionDigits:
                          2,
                      }
                    )}

                    {magicCurrency !==
                      'BRL' &&
                      magicExchangeRate !==
                        null &&
                      ` × ${magicExchangeRate.toLocaleString(
                        'pt-BR',
                        {
                          maximumFractionDigits:
                            6,
                        }
                      )}`}

                  </small>

                )}

              </div>

              {/* AVISO */}

              <div className="magic-warning">

                <span>
                  ✦
                </span>

                <p>
                  Esta ferramenta apenas
                  calcula o valor de Gold
                  ou Platinum. Nenhum
                  recurso é retirado do
                  saldo da Guilda ou do
                  usuário.
                </p>

              </div>

            </article>

          </section>

        )}

      </div>

    </main>
  )
}

export default Calculator