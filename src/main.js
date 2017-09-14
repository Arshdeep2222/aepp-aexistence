/* global Vue */

const machine = require('./machine');

let globalWeb3 = null;
let globalContract = null;

(function(){
	const Intro = { template: '#intro' };

	const Camera = {
		template: '#camera',
		props : [
			'show'
		],
		data : function() {
			return {
				//show : false,
			};
		},
		methods : {
			close : function() {
				this.$emit('picture');
			}
		}
	}

	const Proof2 = {
		template : '#proof2',
		data : function() {
			return {
				cssClass : {
					image : {
						fullscreen : false,
					}
				},
				rawProof: null
			}
		},
		computed : {
			hash: function() {
				return this.$route.params.id;
			},
			proof : function() {
				let hash = this.$route.params.id;
				let data = {
					image: '/img/uploads/' + hash,
					title: '?',
					fileSha256: hash,
					created : null,
					verified : null,
					confirmations : 0,
					contract: '0x8a9c4bb2f2...',
					block: '1133777',
					fileType: 'image/jpeg',
					fileSize: '1.4 Mb',
					fileLocation : 'Dropbox'
				};

				if (this.rawProof) {
					data.contract = this.rawProof[0];
					data.created = this.rawProof[2];
					data.block = this.rawProof[3];
					data.title = this.rawProof[4];
				}

				return data;
			}
		},
		methods : {
			toggleImage : function() {
				this.cssClass.image.fullscreen =
					! this.cssClass.image.fullscreen;

			},
			getProof: function(text) {
				let contract = globalContract;
				if (contract) {
					contract.getProof(text, (err, proof) => {
						this.rawProof = proof;
						console.log('getProof', err, proof);
					});
				}
			},
		},
		mounted: function() {
			let app = this;

			app.getProof(app.hash);
		}
	};

	const Proof = {
		template : '#proof',
		data : function() {
			return {
				cssClass : {
					image : {
						fullscreen : false,
					}
				}
			}
		},
		computed : {
			proof : function() {
				return this.$store.getters.getProofById( this.$route.params.id );
			}
		},
		methods : {
			toggleImage : function() {
				this.cssClass.image.fullscreen =
					! this.cssClass.image.fullscreen;

			}
		}
	};
	const ProofsListEntry = {
		template : '#proofs-list-entry',
		props : [
			'proof'
		]
	}

	const ProofsList = {
		template : '#proofs-list',
		components : {
			'proofsListEntry' : ProofsListEntry,
		},
		computed : {
			proofs : function() {
				return this.$store.state.proofs;
			}
		}
	};

	const Avatar = {
		template : '#avatar',
		props : [
			'image'
		],
		computed : {
			style : function() {
				return {
					backgroundImage: "url('"+this.image+"')"
				}
			}
		}
	};

	const Identity = {
		template: '#identity',
		components : {
			'avatar' : Avatar
		},
		data : function() {
			return {
				showPaymentUi : false
			};
		},
		computed : {
			identity : function() {
				return this.$store.state.identity;
			},
			collapsed : function() {
				return (!this.showPaymentUi) && this.$store.state.identityCollapsed;
			},
			paymentRequest : function() {
				return this.$store.state.identity.paymentRequest;
			},
		},
		watch : {
			paymentRequest : function(req) {
				console.log(req);
				if(req) {
				this.showPaymentUi = true;
				} else {
					this.showPaymentUi = false;
				}
			}
		},
		methods: {
			toggle : function() {
				if(this.$store.state.appClass !== 'home') {
					this.$store.commit('identityCollapsed', !this.$store.state.identityCollapsed);
				}
			},
			pay : function() {
				store.dispatch('approvePayment');
				setTimeout(()=>{
					this.showPaymentUi = false;
				}, 200);
			},
			cancel : function() {
				store.dispatch('cancelPayment');
				this.showPaymentUi = false;
			}
		}
	};

	const Home = {
		template: '#home',
		components: {
			'identity' : Identity
		}
	};

	const MessageSenderEnum = {
		ME : 0,
		APP : 1,
	};

	const MessageBodyTypeEnum = {
		TEXT : 0,
		IMAGE : 1,
		PAYMENT : 2,
	}

	const Speech = {
		template : '#speech',
		props : [
			'body',
			'sender'
		],
		computed : {
			thisclass : function() {
				return {
					'app' : this.sender === MessageSenderEnum.APP,
					'me' : this.sender === MessageSenderEnum.ME,
					'body-type-image ' : this.body.type === MessageBodyTypeEnum.IMAGE,
					'body-type-text' : this.body.type === MessageBodyTypeEnum.TEXT,
					'speech': true,
				};
			},
			style : function() {
				return {
					backgroundImage: this.body.type === MessageBodyTypeEnum.IMAGE ? "url('img/"+this.body.image+"')" : null,
				};
			}
		}
	}

	const Chat = {
		template: '#chat',
		components: {
			'speech' : Speech,
			'camera' : Camera,
		},
		data: function() {
			return {
				machine: machine(),
				messages: [],
				showti : false,
				showresp : false,
				showCamera : false,
				showFileUpload: false,
				showFreetext: false,
				userInput: '',
				fileUploadFormData: new FormData(),
				proof: {
					hash: null,
					description: '',
					txId: null
				}
			}
		},
		computed: {
			answers: function() {
				return this.machine.getCurrentQuestion().getPossibleAnswers();
			},
			hasAnswers: function() {
				return this.answers && this.answers.length > 0;
			}
		},
		methods: {
			scrollDown : function() {
				setTimeout(function(){
					document.getElementsByClassName('conversation-container')[0].scrollTop = 100000000
				},100);
			},
			handleAnswer: function(givenAnswer) {
				this.addMessage({
					sender : MessageSenderEnum.ME,
					body : {
						type : MessageBodyTypeEnum.TEXT,
						text : givenAnswer,
					},
				});
				this.machine.setAnswer(givenAnswer);
			},
			handleFreetextInput: function() {
				this.handleAnswer(this.userInput);
				this.userInput = '';
			},
			showQuestionDelayed: function(text) {
				let app = this;
				this.showti = true;
				setTimeout(function() {
					app.showti = false;
					app.addMessage({
						sender: MessageSenderEnum.APP,
						body: {
							type: MessageBodyTypeEnum.TEXT,
							text: text,
						},
					});
				}, 1000);
			},
			startProof: function(textToProof, comment) {
				let contract = globalContract;
				if (contract) {
					let transactionOptions = {
						gas: 200000
					};
					contract.notarize(textToProof, comment, transactionOptions, (err, txId) => {
						console.log(err, txId);
						if (err) {
							this.machine.transition('transactionError');
						} else {
							this.proof.txId = txId;
							this.machine.transition('summary');
						}
					});
				}
			},
			onFileChange: function(event) {
				console.log('onFileChange', event.target.files);
				this.fileUploadFormData.set('file', event.target.files[0]);

				this.sendFile();
			},
			preventSubmit: function(event) {
				event.preventDefault();
			},
			sendFile: function(event) {
				if (event) {
					event.preventDefault();
				}

				this.$http.post('/upload', this.fileUploadFormData).then(response => {
					console.log('yay', response);
					let hash = response.body.hash;
					this.proof.hash = hash;
					this.addMessage({
						sender : MessageSenderEnum.ME,
						body : {
							type : MessageBodyTypeEnum.IMAGE,
							image : 'uploads/' + hash
						}
					});
					this.machine.setAnswer('pay');
				}, response => {
					console.log('nay', response);
					this.addMessage({
						sender : MessageSenderEnum.APP,
						body : {
							type : MessageBodyTypeEnum.TEXT,
							text : 'Something went wrong D: ',
						},
					});
				});
			},
			addMessage: function(message) {
				this.messages.push(message);
				this.scrollDown();
			},
			showSummary: function() {
				this.addMessage({
					sender : MessageSenderEnum.APP,
					body : {
						type : MessageBodyTypeEnum.IMAGE,
						image : '/uploads/' + this.proof.hash,
						link : '/proofs/' + this.proof.hash,
						linktext : this.proof.description
					},
				});
			}
		},
		mounted: function() {
			let app = this;

			this.machine.on("transition", data => {
				let fromState = data.fromState;
				let toState = data.toState;
				console.log("we just transitioned from " + fromState + " to " + toState);
				this.showQuestionDelayed(this.machine.getCurrentQuestion().getQuestionText())
			});

			this.machine.on("startProof", () => {
				console.log('startProof');
				let text = app.proof.hash;
				let comment = app.proof.description;
				app.startProof(text, comment);
			});

			this.machine.on("showFileUpload", (showFileUpload) => {
				console.log('showFileUpload');
				app.showFileUpload = showFileUpload;
			});

			this.machine.on("showFreetext", (showFreetext) => {
				console.log('showFreetext');
				app.showFreetext = showFreetext;
			});

			this.machine.on("proofDescriptionGiven", (givenDescription) => {
				console.log('proofDescriptionGiven');
				app.proof.description = givenDescription;
			});

			this.machine.on("showSummary", () => {
				app.showSummary();
			});

			this.machine.setAnswer('go');

			setTimeout(function() {
				let web3 = globalWeb3;
				let contract = globalContract;
				if (web3) {
					let account = web3.eth.accounts[0];
					console.log('web3', web3, contract);
					// if (account) {
					// 	let transaction = {
					// 		gas: 200000
					// 	};
					// 	contract.notarize("hurr", transaction, (err, data) => {
					// 		console.log(err, data);
					// 	});
					// }
					// contract.checkDocument(web3.fromAscii('lol', 32), (err, data) => {
					// 	console.log(err, data);
					// });
					//
				} else {
					console.log('no web3');
				}
			}, 2000);

		}
	};

	const New = {
		template: '#new',
		components: {
			'speech' : Speech,
			'camera' : Camera,
		},
		data : function() {
			return {
				proof : {
					created : null,
					verified : null,
					title : '',
					image : 'img/image.jpg',
					confirmations : 0,
					contract: '0x8a9c4bb2f2...',
					block: '1133777',
					fileSha256: 'd91ef0a24a9eb1c1...',
					fileType: 'image/jpeg',
					fileSize: '1.4 Mb',
					fileLocation : 'Dropbox'
				},
				showCamera : false,
				showti : true,
				showresp : false,
				userInput : 'rental car damage',
				i : 0,
				messages : [
				],
				f : [
					{
						sender : MessageSenderEnum.APP,
						body : {
							type : MessageBodyTypeEnum.TEXT,
							text :	"How about creating your first proof? You can prove the existence of a picture or a file.",
						},
					},
					{
						sender : MessageSenderEnum.ME,
						body : {
							type : MessageBodyTypeEnum.TEXT,
							text : "Camera",
						},
					},
					{
						sender : MessageSenderEnum.ME,
						body : {
							type : MessageBodyTypeEnum.IMAGE,
							image : 'image.jpg',
							link : false
						},
					},
					{
						sender : MessageSenderEnum.APP,
						body : {
							type : MessageBodyTypeEnum.TEXT,
							text :	"OK! Now you want to give your proof a reasonable name. Make it descriptive!",
						},
					},
					{
						sender : MessageSenderEnum.ME,
						body : {
							type : MessageBodyTypeEnum.TEXT,
							text : "rental car damage",
						},
					},
					{
						sender : MessageSenderEnum.APP,
						body : {
							type : MessageBodyTypeEnum.TEXT,
							text : "Got that! This proof will cost 0.1 AET.",
						},
					},
					{
						sender : MessageSenderEnum.ME,
						body : {
							type : MessageBodyTypeEnum.TEXT,
							text : "Yes, I pay 0.1 AET",
						},
					},
					{
						sender : MessageSenderEnum.APP,
						body : {
							type : MessageBodyTypeEnum.TEXT,
							text : "Success! Your proof has been created.",
						},
					},
					{
						sender : MessageSenderEnum.APP,
						body : {
							type : MessageBodyTypeEnum.IMAGE,
							image : 'image.jpg',
							link : '/proofs/1',
							linktext : 'rental car damage'
						},
					},
				]
			}
		},
		watch : {
			i : function(val) {
				if(val == 2) {
					this.showCamera = true;
				}
			}
		},
		methods : {
			scrollDown : function() {
				setTimeout(function(){
					document.getElementsByClassName('conversation-container')[0].scrollTop = 100000000
				},100);
			},
			pictureTaken : function() {
				this.showCamera = false;
				this.bot(1);
			},
			bot : function(inc) {
				this.showti = true;
				setTimeout(()=>{
					this.showti = false;
					for (var x = 0; x < inc; x++) {
						if(this.i === 8) {
							var lastp = store.state.proofs[store.state.proofs.length - 1];
							this.f[this.i].body.link = '/proofs/'+lastp.id;
							this.f[this.i].body.linktext = lastp.title;
						}
						this.messages.push(this.f[this.i++]);
					}
					this.showresp = true;
					this.scrollDown();
				},1000);
			},
			why : function(i) {
				this.messages.push({
						sender : MessageSenderEnum.ME,
						body : {
							type : MessageBodyTypeEnum.TEXT,
							text :	"Why?",
						},
					});
				this.showti = true;
				setTimeout(()=>{
					this.showti = false;
					this.messages.push({
						sender : MessageSenderEnum.APP,
						body : {
							type : MessageBodyTypeEnum.TEXT,
							text :	i == 0 ? "More explanation soon1" : "More explanation soon2",
						},
					}
					);
					this.showresp = true;
					this.scrollDown();
				},1000);
			},
			start : function() {
				this.i = 0;
				this.bot(1);
				//setTimeout(()=>{
				//},500);
			},
			cancel : function() {
				this.messages.push({
						sender : MessageSenderEnum.ME,
						body : {
							type : MessageBodyTypeEnum.TEXT,
							text :	"Cancel",
						},
					});
				this.showti = true;
				setTimeout(()=>{
					this.showti = false;
					this.messages.push({
						sender : MessageSenderEnum.APP,
						body : {
							type : MessageBodyTypeEnum.TEXT,
							text :	"As you wish! You can now start over or leave the app",
						},
					}
					);
					this.showresp = true;
					this.scrollDown();
					this.start();
				},1000);
			},
			user : function(inc) {
				this.showresp = false;
				for (var x = 0; x < inc; x++) {
					if(this.i === 4) {
						this.f[this.i].body.text = this.userInput;
					}
					this.messages.push(this.f[this.i++]);
					if(this.i == 7) {
						store.dispatch('paymentRequest', {
							success : () => {
								this.paymentSuccess();
							},
							canceled : () => {
								this.paymentCanceled();
							},
							amount : 0.1
						});
						this.scrollDown();
						return;
					}
				}
				this.scrollDown();
				this.bot(1);
			},
			paymentSuccess : function() {

				var today = new Date();
				var dd = today.getDate();
				var mm = today.getMonth()+1; //January is 0!
				if(dd<10){
					dd='0'+dd;
				}
				if(mm<10){
					mm='0'+mm;
				}
				var yyyy = today.getFullYear();
				var today = dd+'.'+mm+'.'+yyyy;

				this.proof.created = today;
				this.proof.verified = today;
				this.proof.title = this.userInput;
				this.proof.confirmations = Math.round(Math.random() * 10) + 1;

				store.commit('addProof', this.proof);
				this.bot(2);

			},
			paymentCanceled : function() {
				this.cancel();
			},

		},
		mounted : function(){
			this.start();
		}
	};

	const MenuEntry = {
		template : '#menu-entry',
		props : [
			'link',
			'label'
		]
	}
	const Topbar = {
		template: '#topbar',
		components : {
			'avatar': Avatar,
			'menu-entry': MenuEntry,
			'identity' : Identity
		},
		data : function() {
			return {
				navopen : false,
				showAdd : true,
				showBurger : true,
				showBack : false,
				entris : [
					{
						label : 'My Proofs',
						link : '/proofs',
					},
					{
						label : 'Create a Proof',
						link : '/new',
					},
					//{
						//label : 'Shared with me',
						//link : '/new',
					//},
					//{
						//label : 'My Proofs',
					//},
				]
			}
		},
		computed : {
			thisclass : function() {
				return {
					'topbar' : true,
					'open' : this.navopen,
				};
			},
			identity : function() {
				return this.$store.state.identity;
			},
			title : function() {
				return this.$store.state.title;
			}
		},
		watch: {
			'$route' : function(to, from) {
				var proofDetail = null !== to.path.match(/^\/proofs\/\d+/);

				this.showAdd = to.path !== '/new';
				this.showBurger = !proofDetail;
				this.showBack = proofDetail;
				this.navopen = false;
			}
		},
		methods : {
			toggleopen : function() {
				this.navopen = !this.navopen;
			}
		},
	}

	const store = new Vuex.Store({
		state: {
			title : '',
			appClass : '',
			proofs : [
			],
			identity : {
				avatar: "img/avatar-1.jpg",
				balance : '5.00',
				name : 'Joan',
				address : '0x7D154..',
				paymentRequest : null,
				approvedPayments: [],
				declinedPayments: [],
			},
			identityCollapsed : false,
			hasWeb3: false
		},
		getters: {
			getProofById: (state, getters) => (id) => state.proofs.find(proof => proof.id == id)
		},
		mutations: {
			title : function(state, newtitle) {
				state.title = newtitle;
			},
			addProof : function(state, newProof) {
				newProof.id = state.proofs.length+1;
				state.proofs.push(newProof);
			},
			appClass : function(state, newClass) {
				state.appClass = newClass;
			},
			identityCollapsed : function(state, collapse) {
				state.identityCollapsed = collapse;
			},
			addPaymentRequest : function(state, payment) {
				state.identity.paymentRequest = payment;
			},
			pay : function(state) {
				var paymentRequest = state.identity.paymentRequest;
				state.identity.balance = (state.identity.balance - paymentRequest.amount).toFixed(2);
				state.identity.approvedPayments.push(paymentRequest);
				paymentRequest.success();
			},
			cancel : function(state) {
				state.identity.paymentRequest.canceled();
				state.identity.paymentRequest = null;
			},
			setHasWeb3: function(state, hasWeb3) {
				state.hasWeb3 = hasWeb3;
			},
			setAccount: function(state, account) {
				state.identity.address= account;
			},
			setBalance: function(state, balance) {
				state.identity.balance = balance;
			},
			setName: function(state, name) {
				state.identity.name = name;
			}
		},
		actions : {
			paymentRequest : function(context, payment) {
				context.commit('addPaymentRequest', payment);
			},
			approvePayment : function(context) {
				context.commit('pay');
			},
			cancelPayment : function(context) {
				context.commit('cancel');
			}
		}
	});

	const routes = [
		{ path: '/', component: Intro, meta : {
			title : 'Welcome',
			appClass : 'welcome'
		}},
		{ path: '/home', component: Home, meta : {
			title : 'Æxistence',
			appClass : 'home'
		}},
		{ path: '/chat', component: Chat, meta : {
			title : 'Create Proof',
			appClass : 'new'
		}},
		{ path: '/new', component: New, meta : {
			title : 'Create Proof',
			appClass : 'new'
		}},
		{ path: '/camera', component: Camera, meta : {
			title : 'Camer',
			appClass : 'camera'
		}},
		{ path: '/proofs', component: ProofsList, meta : {
			title : 'Your Proofs',
			appClass : 'proofs'
		}},
		{ path: '/proofs/:id', component: Proof2, meta : {
			appClass : 'proof'
		}},
	];

	const router = new VueRouter({
		routes: routes
	});

	router.beforeEach((to, from, next) => {
		document.title = to.meta.title;
		store.commit('title', to.meta.title);
		store.commit('appClass', to.meta.appClass);
		if(to.meta.appClass === 'home') {
			store.commit('identityCollapsed', false);
		} else {
			store.commit('identityCollapsed', true);
		}
		next();
	})

	const app = new Vue({
		el: '#app',
		store,
		computed : {
			appClass : function() {
				return this.$store.state.appClass;
			}
		},
		components : {
			'topbar' : Topbar
		},
		router,
		created: function() {
			if (typeof web3 !== 'undefined') {
				web3 = new Web3(web3.currentProvider);
			} else {
				// set the provider you want from Web3.providers
				// web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
			}
			// web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
			// console.log(web3);
			if (web3) {
				globalWeb3 = web3;

				let abi = [{
					"constant": true,
					"inputs": [{
						"name": "document",
						"type": "string"
					}],
					"name": "calculateHash",
					"outputs": [{
						"name": "",
						"type": "bytes32"
					}],
					"payable": false,
					"type": "function"
				},
				{
					"constant": true,
					"inputs": [{
						"name": "document",
						"type": "string"
					}],
					"name": "getProof",
					"outputs": [{
							"name": "owner",
							"type": "address"
						},
						{
							"name": "proofHash",
							"type": "bytes32"
						},
						{
							"name": "timestamp",
							"type": "uint256"
						},
						{
							"name": "proofBlock",
							"type": "uint256"
						},
						{
							"name": "comment",
							"type": "string"
						}
					],
					"payable": false,
					"type": "function"
				},
				{
					"constant": false,
					"inputs": [{
							"name": "document",
							"type": "string"
						},
						{
							"name": "comment",
							"type": "string"
						}
					],
					"name": "notarize",
					"outputs": [],
					"payable": false,
					"type": "function"
				},
				{
					"constant": true,
					"inputs": [{
						"name": "document",
						"type": "string"
					}],
					"name": "hasProof",
					"outputs": [{
						"name": "",
						"type": "bool"
					}],
					"payable": false,
					"type": "function"
				}];
				let PoEContract = web3.eth.contract(abi);
				PoEContract.at('0x1e05977cef988329a3bb1e5342b088bc5d8e9d69', function (err, contract) {
					globalContract = contract;
				});

				// let account = web3.eth.accounts[0];
				var accountInterval = setInterval(function() {
					if (web3) {
						let address = web3.eth.accounts[0];
						if (address) {
							store.commit('setAccount', address);
							store.commit('setName', address.substr(0, 6));
							web3.eth.getBalance(address, (err, balance) => {
								let readable = parseFloat(web3.fromWei(balance.toString(10), 'ether')).toFixed(3);
								console.log(err, readable);
								store.commit('setBalance', readable);
							});
						}
					}
				}, 1000);
			}

		}
	});
})();

var mySwiper = new Swiper ('.swiper-container', {
	pagination: '.swiper-pagination',
	nextButton: '.next',
});