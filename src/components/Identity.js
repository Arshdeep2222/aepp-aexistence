import { AeIdentityAvatar } from '@aeternity/aepp-components'

export default {
  name: 'identity',
  components: {
    'ae-identity-avatar': AeIdentityAvatar
  },
  data: function () {
    return {
      showPaymentUi: false
    }
  },
  computed: {
    identity: function () {
      return this.$store.state.identity
    },
    collapsed: function () {
      return (!this.showPaymentUi) && this.$store.state.identityCollapsed
    },
    paymentRequest: function () {
      return this.$store.state.identity.paymentRequest
    },
    blockie: function () {
      return false // blockies.create();
    }
  },
  watch: {
    paymentRequest: function (req) {
      console.log(req)
      if (req) {
        this.showPaymentUi = true
      } else {
        this.showPaymentUi = false
      }
    }
  },
  methods: {
    toggle: function () {
      if (this.$store.state.appClass !== 'home') {
        this.$store.commit('identityCollapsed', !this.$store.state.identityCollapsed)
      }
    },
    pay: function () {
      this.$store.dispatch('approvePayment')
      setTimeout(() => {
        this.showPaymentUi = false
      }, 200)
    },
    cancel: function () {
      this.$store.dispatch('cancelPayment')
      this.showPaymentUi = false
    }
  }
}
