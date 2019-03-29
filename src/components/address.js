import React, { Component } from 'react';
import '../css/address.css';

export default class Address extends Component {

	constructor() {
		super();
		this.state = {
			connection: new WebSocket('wss://ws.blockchain.info/inv'),
			isValid: true,
			wallet: {}
		};
		this.updateTransactions = this.updateTransactions.bind(this);
	}


	componentDidMount() {
		let walletAddress = new URLSearchParams(this.props.location.search).get('addr');
		let page = new URLSearchParams(this.props.location.search).get('page') ? "&offset=" + new URLSearchParams(this.props.location.search).get('page')*50 : "";
		fetch(`https://blockchain.info/rawaddr/${walletAddress}?cors=true&format=json${page}`)
			.then(res => {
				if(res.status === 500) {
					return false;
				} else {
					return res.json();
				}
			})
			.then(data => {
				if(data) {
					this.setState({
						wallet: data
					});
					const connection = this.state.connection;
					connection.onopen = () => {
						let message = {
							"op": "addr_sub",
							"addr": walletAddress
						};
						connection.send(JSON.stringify(message));
					};
					connection.onmessage = this.updateTransactions;
				} else {
					this.setState({
						isValid: false,
						wallet: {
							address: walletAddress
						}
					});
				}
			});
	}

	updateTransactions(transaction) {
		this.setState(state => {
			const transactions = [transaction, ...state.transactions];

			return {
				transactions
			};
		});
	};

	render() {
		let content = this.state.isValid ? <Wallet data={this.state.wallet} /> : <InvalidAddress address={this.state.wallet.address} />;
		return (
			<div className="container my-5">
				{content}
			</div>
		);
	}
}

const InvalidAddress = (props) => {
	return (
		<div className="alert alert-danger d-flex justify-content-start" role="alert">
			<strong>Error:</strong> &nbsp; <i>{props.address}</i> &nbsp; is not a valid bitcoin address.
		</div>
	);
};

const Wallet = (props) => {
	let summary, transactions;
	if(Object.keys(props.data).length > 0) {
		summary = (
			<ul className="list-group list-group-flush">
				<li className="list-group-item summary-item">
					<span className="item-key">Address</span>
					<span>{props.data.address}</span>
				</li>

				<li className="list-group-item summary-item">
					<span className="item-key">Hash160</span>
					<span>{props.data.hash160}</span>
				</li>

				<li className="list-group-item summary-item">
					<span className="item-key">Number of Transactions</span>
					<span>{props.data.n_tx}</span>
				</li>

				<li className="list-group-item summary-item">
					<span className="item-key">Bitcoin received</span>
					<span className="btc-value">{props.data.total_received / 100000000}</span>
				</li>

				<li className="list-group-item summary-item">
					<span className="item-key">Bitcoin sent</span>
					<span className="btc-value">{props.data.total_sent / 100000000}</span>
				</li>

				<li className="list-group-item summary-item">
					<span className="item-key">Current balance</span>
					<span className="btc-value">{props.data.final_balance / 100000000}</span>
				</li>
			</ul>
		);

		if(props.data.txs.length > 0) {
			transactions = props.data.txs.map((val, ind) => {
				return <Transaction currentWallet={props.data.address} data={val} confirmed={val.inputs[0].witness} key={ind} />;
			});
		} else {
			transactions = <li className="list-group-item">No transactions so far</li>;
		}
	} else {
		summary = <li className="list-group-item">Loading address details...</li>;
		transactions = <li className="list-group-item">Loading transaction details...</li>;
	}

	return (
		<div className="row">
			<div className="summary col-lg-9 col-12 px-2">
				<div className="card">
					<div className="card-header">
						Summary
					</div>
					{summary}
				</div>
			</div>
			<div className="transactions my-4 col-lg-12 col-12 px-2">
				<div className="card">
					<div className="card-header">
						Transactions
					</div>

					<ul className="list-group list-group-flush">
						{transactions}
					</ul>
				</div>
			</div>
		</div>
	);
};

const Transaction = (props) => {
	let transactionType;
	if(props.currentWallet === props.data.inputs[0].prev_out.addr) {
		transactionType = "list-group-item transaction list-group-item-danger";
	} else {
		transactionType = "list-group-item transaction list-group-item-success";
	}

	const status = props.confirmed.length > 0 ?
						<button type="button" class="btn btn-primary">Confirmed!</button> :
						<button type="button" class="btn btn-warning">Unconfirmed!</button>;

	const senders = props.data.inputs;
	const receivers = props.confirmed.length > 0 ? props.data.out : new Array(props.data.out.find((val) => {
		return val.addr === props.currentWallet;
	}));

	return (
		<li className={transactionType}>
			<div className="senders">
				{senders.map((val, index) => {
					return <div key={index}>{val.prev_out.addr}</div>;
				})}
			</div>
			<div>&rarr;</div>
			<div className="receivers">
				{receivers.map((val, index) => {
					return (
						<div className="receiver" key={index}>
							<div>{val.addr}</div>
							<div className="amount btc-value">{val.value / 1000000}</div>
						</div>
					);
				})}
				<div class="status">
					{status}
				</div>
			</div>
		</li>
	);
}